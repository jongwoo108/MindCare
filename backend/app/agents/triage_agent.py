import json
import structlog
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI

from ..config import get_settings
from .state import ConversationState
from .prompts.triage import TRIAGE_SYSTEM_PROMPT

logger = structlog.get_logger(__name__)
settings = get_settings()


def _get_last_user_message(state: ConversationState) -> str:
    for msg in reversed(state["messages"]):
        if msg.type == "human":
            return msg.content
    return ""


async def triage_node(state: ConversationState) -> dict:
    """
    LangGraph 노드: 모든 메시지에 대해 실행.
    위험도(0-10)와 치료 접근 방식을 결정하고 라우팅을 제어한다.
    반환값은 state에 병합(merge)된다 — 변경할 키만 반환.
    """
    last_msg = _get_last_user_message(state)
    previous_risks = state["session_context"].get("previous_risk_levels", [])

    llm = ChatOpenAI(
        model=settings.active_model,
        temperature=0,
        model_kwargs={"response_format": {"type": "json_object"}},
    )

    system_prompt = TRIAGE_SYSTEM_PROMPT.format(previous_risk_levels=previous_risks or "없음")

    try:
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=last_msg),
        ])
        result = json.loads(response.content)

        risk_level = int(result.get("risk_level", 5))
        risk_level = max(0, min(10, risk_level))  # 0-10 범위 보정

        logger.info(
            "triage_complete",
            risk_level=risk_level,
            approach=result.get("therapeutic_approach"),
            factors=result.get("risk_factors"),
        )

        return {
            "risk_level": risk_level,
            "risk_factors": result.get("risk_factors", []),
            "therapeutic_approach": result.get("therapeutic_approach", "supportive"),
            "active_agent": "triage",
        }

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        # 파싱 실패 시 보수적으로 중간 위험도 반환
        logger.warning("triage_parse_error", error=str(e))
        return {
            "risk_level": 5,
            "risk_factors": ["parse_error"],
            "therapeutic_approach": "supportive",
            "active_agent": "triage",
        }
