import operator
from typing import Annotated, Optional, TypedDict
from langchain_core.messages import BaseMessage


class SessionContext(TypedDict):
    session_id: str
    user_id: str
    message_count: int
    previous_risk_levels: list[int]  # 최근 10개 위험도 추이


class ConversationState(TypedDict):
    # 메시지 히스토리 — operator.add로 append-only 보장 (LangGraph 상태 병합 시 덮어쓰기 방지)
    messages: Annotated[list[BaseMessage], operator.add]

    # Triage 결과
    risk_level: int           # 0-10 (SAFETY_PROTOCOL.md 기준)
    risk_factors: list[str]   # 감지된 위험 요인

    # 라우팅 제어
    therapeutic_approach: str  # "cbt" | "supportive" | "crisis"
    active_agent: str          # "triage" | "counseling" | "crisis"

    # 세션 컨텍스트
    session_context: SessionContext

    # 안전 플래그
    safety_flags: list[str]
    crisis_escalated: bool
    input_blocked: bool

    # Safety Guardrail 통과 후 최종 응답
    final_response: Optional[str]

    # 장기 메모리 컨텍스트 (ChromaDB에서 검색한 이전 세션 요약)
    long_term_context: Optional[str]
