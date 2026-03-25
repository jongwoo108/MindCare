import structlog
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI

from ..config import get_settings
from .state import ConversationState
from .prompts.counseling import COUNSELING_PROMPTS

logger = structlog.get_logger(__name__)
settings = get_settings()

# "crisis" approach가 잘못 라우팅된 경우 fallback
_FALLBACK_APPROACH = "supportive"


async def counseling_node(state: ConversationState) -> dict:
    """
    LangGraph 노드: risk_level < CRISIS_RISK_THRESHOLD인 경우 활성화.
    CBT 또는 지지적 상담 접근으로 응답을 생성한다.
    """
    approach = state.get("therapeutic_approach", _FALLBACK_APPROACH)

    # crisis approach는 crisis_node에서만 처리
    if approach == "crisis":
        approach = _FALLBACK_APPROACH

    system_prompt = COUNSELING_PROMPTS.get(approach, COUNSELING_PROMPTS[_FALLBACK_APPROACH])

    # 초기 평가 결과 + 장기 메모리 컨텍스트를 system prompt 앞에 순서대로 주입
    prefix_parts = []
    assessment_context = state.get("assessment_context", "")
    if assessment_context:
        prefix_parts.append(assessment_context)
    long_term_context = state.get("long_term_context", "")
    if long_term_context:
        prefix_parts.append(long_term_context)
    if prefix_parts:
        system_prompt = "\n\n---\n\n".join(prefix_parts) + "\n\n---\n\n" + system_prompt

    llm = ChatOpenAI(model=settings.active_model, temperature=0.7)

    # 최근 10개 메시지만 전달 (토큰 절약)
    recent_messages = state["messages"][-10:]
    messages_for_llm = [SystemMessage(content=system_prompt), *recent_messages]

    try:
        response = await llm.ainvoke(messages_for_llm)
        logger.info("counseling_response", approach=approach, risk_level=state["risk_level"])
        return {
            "final_response": response.content,
            "active_agent": "counseling",
        }
    except Exception as e:
        logger.error("counseling_error", error=str(e))
        return {
            "final_response": "지금 많이 힘드시겠어요. 조금 더 이야기해 주시겠어요?",
            "active_agent": "counseling",
        }
