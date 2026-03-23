import structlog
from langgraph.graph import StateGraph, END

from .state import ConversationState
from .triage_agent import triage_node
from .counseling_agent import counseling_node
from .crisis_agent import crisis_node
from ..safety.guardrail import input_filter_node, output_validator_node
from ..config import get_settings

logger = structlog.get_logger(__name__)

# ─────────────────────────────────────────
# 조건 함수 (Conditional Edge Functions)
# ─────────────────────────────────────────

def route_after_filter(state: ConversationState) -> str:
    """입력 필터 결과에 따라 라우팅."""
    if state.get("input_blocked"):
        return "blocked"
    return "continue"


def route_by_risk_level(state: ConversationState) -> str:
    """Triage 결과에 따라 에이전트 라우팅 (SAFETY_PROTOCOL.md 위험도 기준)."""
    settings = get_settings()
    risk = state.get("risk_level", 0)
    route = "crisis" if risk >= settings.crisis_risk_threshold else "counseling"
    logger.info("routing", risk_level=risk, route=route)
    return route


# ─────────────────────────────────────────
# StateGraph 조립
# ─────────────────────────────────────────

def build_graph():
    """
    LangGraph StateGraph 구조:

    START
      │
      ▼
    [input_filter] ──blocked──► END
      │ continue
      ▼
    [triage]
      │
      ├─ risk >= 7 ──► [crisis] ──► [output_validator] ──► END
      │
      └─ risk < 7  ──► [counseling] ──► [output_validator] ──► END
    """
    graph = StateGraph(ConversationState)

    # 노드 등록
    graph.add_node("input_filter", input_filter_node)
    graph.add_node("triage", triage_node)
    graph.add_node("counseling", counseling_node)
    graph.add_node("crisis", crisis_node)
    graph.add_node("output_validator", output_validator_node)

    # 진입점
    graph.set_entry_point("input_filter")

    # 입력 필터 후 분기
    graph.add_conditional_edges(
        "input_filter",
        route_after_filter,
        {
            "blocked": END,
            "continue": "triage",
        },
    )

    # Triage 후 위험도 기반 분기 (핵심 라우팅)
    graph.add_conditional_edges(
        "triage",
        route_by_risk_level,
        {
            "crisis": "crisis",
            "counseling": "counseling",
        },
    )

    # 각 에이전트 후 출력 검증 → 종료
    graph.add_edge("counseling", "output_validator")
    graph.add_edge("crisis", "output_validator")
    graph.add_edge("output_validator", END)

    return graph.compile()


# 싱글톤 — 앱 시작 시 한 번만 컴파일 (첫 요청 지연 방지)
_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
        logger.info("langgraph_compiled")
    return _compiled_graph
