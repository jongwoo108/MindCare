import structlog
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI

from ..config import get_settings
from .state import ConversationState
from .prompts.crisis import CRISIS_SYSTEM_PROMPT, CRISIS_RESOURCES

logger = structlog.get_logger(__name__)
settings = get_settings()


def _build_resource_text() -> str:
    lines = ["\n\n---", "지금 당장 도움이 필요하시면 연락하세요:"]
    for r in CRISIS_RESOURCES:
        lines.append(f"• {r['name']}: **{r['number']}** ({r['hours']})")
    return "\n".join(lines)


async def crisis_node(state: ConversationState) -> dict:
    """
    LangGraph 노드: risk_level >= CRISIS_RISK_THRESHOLD인 경우 활성화.
    즉각적인 안전 확인 + 위기 지원 안내 응답을 생성한다.
    crisis_escalated=True를 설정하여 전문가 알림 트리거.
    """
    llm = ChatOpenAI(model=settings.active_model, temperature=0.3)

    # 초기 평가 + 이전 세션 맥락 참고 (과거 자해 이력 등)
    prefix_parts = []
    assessment_context = state.get("assessment_context", "")
    if assessment_context:
        prefix_parts.append(assessment_context)
    long_term_context = state.get("long_term_context", "")
    if long_term_context:
        prefix_parts.append(long_term_context)
    crisis_prompt = (
        "\n\n---\n\n".join(prefix_parts) + "\n\n---\n\n" + CRISIS_SYSTEM_PROMPT
        if prefix_parts else CRISIS_SYSTEM_PROMPT
    )

    recent_messages = state["messages"][-5:]
    messages_for_llm = [SystemMessage(content=crisis_prompt), *recent_messages]

    try:
        response = await llm.ainvoke(messages_for_llm)
        full_response = response.content + _build_resource_text()

        logger.warning(
            "crisis_activated",
            risk_level=state["risk_level"],
            risk_factors=state.get("risk_factors", []),
            session_id=state["session_context"].get("session_id"),
        )

        return {
            "final_response": full_response,
            "crisis_escalated": True,
            "active_agent": "crisis",
            "safety_flags": state.get("safety_flags", []) + ["CRISIS_ACTIVATED"],
        }

    except Exception as e:
        logger.error("crisis_node_error", error=str(e))
        # 에러 시에도 반드시 위기 안내 메시지 반환
        fallback = (
            "지금 많이 힘드시죠. 당신의 안전이 가장 중요합니다."
            + _build_resource_text()
        )
        return {
            "final_response": fallback,
            "crisis_escalated": True,
            "active_agent": "crisis",
            "safety_flags": state.get("safety_flags", []) + ["CRISIS_ACTIVATED", "FALLBACK_USED"],
        }
