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
from ..schemas.chat import WSMessageIn, WSResponseOut, WSResponseMetadata, WSRiskAlert, WSErrorOut

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["chat"])


def _dict_to_message(msg: dict):
    """Redis에 저장된 메시지 dict를 LangChain Message 객체로 변환."""
    role = msg.get("role", "user")
    content = msg.get("content", "")
    if role == "user":
        return HumanMessage(content=content)
    return AIMessage(content=content)


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
            }

            # LangGraph 실행
            result = await graph.ainvoke(state)

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

            logger.info(
                "message_processed",
                session_id=session_id,
                agent=result.get("active_agent"),
                risk_level=result.get("risk_level", 0),
            )

    except WebSocketDisconnect:
        logger.info("ws_disconnected", session_id=session_id)
    except Exception as e:
        logger.error("ws_error", session_id=session_id, error=str(e))
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
