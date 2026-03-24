import asyncio
import uuid
import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from langchain_core.messages import HumanMessage, AIMessage

from ..agents.orchestrator import get_graph
from ..agents.state import ConversationState
from ..core.redis_client import get_redis
from ..core.security import verify_token
from ..memory.working_memory import WorkingMemory
from ..memory.session_summarizer import SessionSummarizer
from ..schemas.chat import WSMessageIn, WSResponseOut, WSResponseMetadata, WSRiskAlert, WSErrorOut

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["chat"])

# 세션 요약 트리거 임계값 (메시지 쌍 기준)
_SUMMARY_TRIGGER_COUNT = 10


def _dict_to_message(msg: dict):
    """Redis에 저장된 메시지 dict를 LangChain Message 객체로 변환."""
    role = msg.get("role", "user")
    content = msg.get("content", "")
    if role == "user":
        return HumanMessage(content=content)
    return AIMessage(content=content)


async def _create_expert_review(
    session_id: str,
    user_id: str,
    result: dict,
    context_summary: str | None = None,
) -> None:
    """
    고위험 응답에 대한 전문가 리뷰 레코드를 생성하고
    연결된 전문가에게 실시간 알림을 브로드캐스트한다.
    """
    try:
        from ..core.database import AsyncSessionFactory
        from ..models.expert_review import ExpertReview
        from .expert_ws_manager import expert_ws_manager
        import uuid as _uuid

        review_id = _uuid.uuid4()
        async with AsyncSessionFactory() as db:
            review = ExpertReview(
                id=review_id,
                session_id=_uuid.UUID(session_id),
                user_id=_uuid.UUID(user_id),
                ai_response=result.get("final_response", ""),
                risk_level=result.get("risk_level", 0),
                risk_factors=result.get("risk_factors", []),
                context_summary=context_summary,
                status="pending",
            )
            db.add(review)
            await db.commit()

        # 연결된 전문가 전원에게 실시간 알림
        await expert_ws_manager.broadcast_high_risk({
            "type": "high_risk_alert",
            "review_id": str(review_id),
            "session_id": session_id,
            "user_id": user_id,
            "risk_level": result.get("risk_level", 0),
            "risk_factors": result.get("risk_factors", []),
            "ai_response": result.get("final_response", ""),
            "context_summary": context_summary,
        })

        logger.info(
            "expert_review_created",
            review_id=str(review_id),
            session_id=session_id,
            risk_level=result.get("risk_level", 0),
        )

    except Exception as e:
        logger.error("expert_review_error", session_id=session_id, error=str(e))


async def _persist_messages(session_id: str, user_content: str, result: dict) -> None:
    """PostgreSQL에 메시지를 영속화한다. WebSocket 응답 블로킹 방지를 위해 별도 태스크로 실행."""
    try:
        from ..core.database import AsyncSessionFactory
        from ..models.message import Message
        from ..models.session import Session
        import uuid as _uuid
        from sqlalchemy import update
        from datetime import datetime, timezone

        async with AsyncSessionFactory() as db:
            # 사용자 메시지 저장
            user_msg = Message(
                id=_uuid.uuid4(),
                session_id=_uuid.UUID(session_id),
                role="user",
                content=user_content,
                risk_level=result.get("risk_level"),
            )
            db.add(user_msg)

            # AI 응답 저장
            ai_msg = Message(
                id=_uuid.uuid4(),
                session_id=_uuid.UUID(session_id),
                role="assistant",
                content=result.get("final_response", ""),
                agent_type=result.get("active_agent"),
                risk_level=result.get("risk_level"),
                metadata_json={
                    "safety_flags": result.get("safety_flags", []),
                    "therapeutic_approach": result.get("therapeutic_approach"),
                    "crisis_escalated": result.get("crisis_escalated", False),
                },
            )
            db.add(ai_msg)

            # 세션 통계 업데이트
            await db.execute(
                update(Session)
                .where(Session.id == _uuid.UUID(session_id))
                .values(
                    message_count=Session.message_count + 2,
                    risk_level=result.get("risk_level", 0),
                    therapeutic_approach=result.get("therapeutic_approach"),
                    status="crisis" if result.get("crisis_escalated") else "active",
                    last_activity_at=datetime.now(timezone.utc),
                )
            )
            await db.commit()

    except Exception as e:
        logger.error("persist_messages_error", session_id=session_id, error=str(e))


async def _save_session_to_ltm(
    user_id: str,
    session_id: str,
    memory: WorkingMemory,
    peak_risk: int,
    therapeutic_approach: str,
) -> None:
    """
    세션 요약을 생성하여 ChromaDB(장기 메모리)에 저장한다.
    WebSocket disconnect 또는 메시지 임계값 도달 시 호출.
    """
    try:
        messages = await memory.get_messages(session_id)
        if len(messages) < 4:
            return

        summarizer = SessionSummarizer()
        summary = await summarizer.summarize(
            messages=messages,
            risk_level=peak_risk,
            therapeutic_approach=therapeutic_approach,
        )
        if not summary:
            return

        from ..core.chroma_client import get_chroma_client
        from ..memory.long_term_memory import LongTermMemory

        client = await get_chroma_client()
        ltm = LongTermMemory(client)
        await ltm.store_session_summary(
            user_id=user_id,
            session_id=session_id,
            summary=summary,
            risk_level=peak_risk,
            therapeutic_approach=therapeutic_approach,
            message_count=len(messages),
        )
        logger.info("ltm_session_saved", session_id=session_id, user_id=user_id)

    except Exception as e:
        logger.error("ltm_save_error", session_id=session_id, error=str(e))


@router.websocket("/ws/chat/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(..., description="JWT access token"),
):
    await websocket.accept()

    # JWT 검증
    try:
        payload = verify_token(token)
    except ValueError:
        await websocket.send_json(WSErrorOut(code="INVALID_TOKEN", message="유효하지 않은 토큰입니다.").model_dump())
        await websocket.close(code=4001)
        return

    redis = await get_redis()
    memory = WorkingMemory(redis)
    graph = get_graph()

    # 세션 추적 변수
    peak_risk = 0
    last_approach = "supportive"
    message_pair_count = 0

    logger.info("ws_connected", session_id=session_id, user_id=payload.sub)

    try:
        while True:
            raw = await websocket.receive_json()

            try:
                msg_in = WSMessageIn(**raw)
            except Exception:
                await websocket.send_json(WSErrorOut(code="INVALID_MESSAGE", message="메시지 형식이 올바르지 않습니다.").model_dump())
                continue

            if msg_in.type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if not msg_in.content.strip():
                continue

            # 이전 메시지 히스토리 + 위험도 추이 로드
            history = await memory.get_messages(session_id)
            risk_history = await memory.get_risk_history(session_id)

            # ConversationState 구성
            state: ConversationState = {
                "messages": [
                    *[_dict_to_message(m) for m in history],
                    HumanMessage(content=msg_in.content),
                ],
                "risk_level": 0,
                "risk_factors": [],
                "therapeutic_approach": "supportive",
                "active_agent": "triage",
                "session_context": {
                    "session_id": session_id,
                    "user_id": payload.sub,
                    "message_count": len(history),
                    "previous_risk_levels": risk_history,
                },
                "safety_flags": [],
                "crisis_escalated": False,
                "input_blocked": False,
                "final_response": None,
                "long_term_context": None,  # memory_loader_node가 채움
            }

            # LangGraph 실행
            result = await graph.ainvoke(state)

            # 세션 최고 위험도 추적
            current_risk = result.get("risk_level", 0)
            if current_risk > peak_risk:
                peak_risk = current_risk
            last_approach = result.get("therapeutic_approach", "supportive")
            message_pair_count += 1

            # 위기 상황 알림 먼저 전송 (SAFETY_PROTOCOL.md Step 3-4)
            if result.get("crisis_escalated"):
                await websocket.send_json(
                    WSRiskAlert(
                        risk_level=result["risk_level"],
                        risk_factors=result.get("risk_factors", []),
                    ).model_dump()
                )

            # 최종 응답 전송
            await websocket.send_json(
                WSResponseOut(
                    content=result.get("final_response", ""),
                    metadata=WSResponseMetadata(
                        agent=result.get("active_agent", "counseling"),
                        risk_level=result.get("risk_level", 0),
                        therapeutic_approach=result.get("therapeutic_approach", "supportive"),
                        safety_flags=result.get("safety_flags", []),
                        expert_review_pending=result.get("risk_level", 0) >= 6,
                    ),
                ).model_dump()
            )

            # Working Memory 업데이트
            await memory.append_message(session_id, {
                "role": "user",
                "content": msg_in.content,
                "risk_level": result.get("risk_level", 0),
            })
            await memory.append_message(session_id, {
                "role": "assistant",
                "content": result.get("final_response", ""),
                "agent_type": result.get("active_agent"),
                "risk_level": result.get("risk_level", 0),
            })
            await memory.track_risk(session_id, result.get("risk_level", 0))

            # PostgreSQL 영속화 (비블로킹)
            asyncio.create_task(
                _persist_messages(session_id, msg_in.content, result)
            )

            # 고위험 시 전문가 리뷰 레코드 생성 + WS 알림 (비블로킹)
            from ..config import get_settings
            _settings = get_settings()
            if current_risk >= _settings.expert_review_threshold:
                asyncio.create_task(
                    _create_expert_review(
                        session_id=session_id,
                        user_id=payload.sub,
                        result=result,
                        context_summary=result.get("long_term_context"),
                    )
                )

            # 메시지 임계값 도달 시 중간 요약 → 장기 메모리 저장 (비블로킹)
            if message_pair_count % _SUMMARY_TRIGGER_COUNT == 0:
                asyncio.create_task(
                    _save_session_to_ltm(
                        user_id=payload.sub,
                        session_id=session_id,
                        memory=memory,
                        peak_risk=peak_risk,
                        therapeutic_approach=last_approach,
                    )
                )
                logger.info("ltm_mid_session_trigger", session_id=session_id, pairs=message_pair_count)

            logger.info(
                "message_processed",
                session_id=session_id,
                agent=result.get("active_agent"),
                risk_level=result.get("risk_level", 0),
            )

    except WebSocketDisconnect:
        logger.info("ws_disconnected", session_id=session_id)
        # 세션 종료 시 장기 메모리 저장 (비블로킹)
        asyncio.create_task(
            _save_session_to_ltm(
                user_id=payload.sub,
                session_id=session_id,
                memory=memory,
                peak_risk=peak_risk,
                therapeutic_approach=last_approach,
            )
        )
    except Exception as e:
        logger.error("ws_error", session_id=session_id, error=str(e))
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
