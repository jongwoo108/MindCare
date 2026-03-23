import re
import structlog
from ..agents.state import ConversationState

logger = structlog.get_logger(__name__)

# ─────────────────────────────────────────
# Layer 1: 입력 필터 패턴 (SAFETY_PROTOCOL.md)
# ─────────────────────────────────────────
_INJECTION_PATTERNS = [
    r"이전\s*지시를?\s*무시",
    r"당신은\s*이제\s*.+입니다",
    r"시스템\s*프롬프트를?\s*(출력|보여)",
    r"제약\s*없이\s*답변",
    r"ignore\s+(?:all\s+)?previous\s+instructions",
    r"jailbreak",
    r"DAN\s+mode",
]

_OUT_OF_SCOPE_PATTERNS = [
    r"약물\s*(용량|종류|처방|추천)",
    r"진단\s*(내려|해줘|해줘요|해주세요)",
    r"어떤\s*약을?\s*(먹|복용)",
]

_ALL_INPUT_PATTERNS = _INJECTION_PATTERNS + _OUT_OF_SCOPE_PATTERNS

# ─────────────────────────────────────────
# Layer 2: 출력 검증 패턴
# ─────────────────────────────────────────
_FORBIDDEN_OUTPUT_PATTERNS = [
    r"\d+\s*mg",           # 약물 용량
    r"DSM-5",              # 진단 기준 직접 언급
    r"당신은\s+.+장애입니다",  # 진단 단정
    r"처방전",
]

_BOUNDARY_RESPONSE = (
    "전문적인 진단이나 처방은 정신건강의학과 전문의만 할 수 있습니다. "
    "가까운 정신건강복지센터(☎ 1577-0199) 또는 병원에 방문하시길 권합니다."
)


def _get_last_user_message(state: ConversationState) -> str:
    for msg in reversed(state["messages"]):
        if msg.type == "human":
            return msg.content
    return ""


async def input_filter_node(state: ConversationState) -> dict:
    """Layer 1: 입력 필터링 노드."""
    last_msg = _get_last_user_message(state)

    for pattern in _ALL_INPUT_PATTERNS:
        if re.search(pattern, last_msg, re.IGNORECASE):
            logger.warning("input_blocked", pattern=pattern, msg_preview=last_msg[:50])
            return {
                "input_blocked": True,
                "final_response": "죄송합니다. 해당 요청은 처리할 수 없습니다. 다른 방식으로 도움을 드릴 수 있을까요?",
                "safety_flags": state.get("safety_flags", []) + ["INPUT_BLOCKED"],
            }

    return {"input_blocked": False}


async def output_validator_node(state: ConversationState) -> dict:
    """Layer 2: 출력 검증 노드. 금지 콘텐츠 패턴을 검사하고 필요 시 응답을 교체한다."""
    response = state.get("final_response", "") or ""

    for pattern in _FORBIDDEN_OUTPUT_PATTERNS:
        if re.search(pattern, response, re.IGNORECASE):
            logger.warning("output_filtered", pattern=pattern)
            return {
                "final_response": _BOUNDARY_RESPONSE,
                "safety_flags": state.get("safety_flags", []) + ["OUTPUT_FILTERED"],
            }

    return {}  # 변경 없음 — LangGraph는 빈 dict를 "변경 없음"으로 처리
