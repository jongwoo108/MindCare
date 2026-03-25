import uuid
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from ..core.database import get_db
from ..core.security import verify_token, TokenPayload
from ..config import get_settings
from ..models.assessment import AssessmentResult
from ..models.session import Session
from ..schemas.assessment import (
    AssessmentSubmit, AssessmentResponse, compute_scores,
    recommend_followups, QUESTION_LABELS, SCALE_LABELS,
    FollowUpSubmit, FollowUpResponse, get_followup_questions,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/sessions", tags=["assessment"])
bearer = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> TokenPayload:
    try:
        return verify_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")


@router.post("/{session_id}/assessment", response_model=AssessmentResponse, status_code=201)
async def submit_assessment(
    session_id: str,
    body: AssessmentSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    세션 시작 직후 정신건강 초기 평가 응답 제출.
    PHQ-9 단축(5문항) + GAD-7 단축(3문항) + 자해/자살 선별(1문항).
    세션당 한 번만 제출 가능 (unique constraint).
    """
    # 세션 소유권 확인
    session_result = await db.execute(
        select(Session).where(
            Session.id == uuid.UUID(session_id),
            Session.user_id == uuid.UUID(current_user.sub),
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    # 중복 제출 방지
    existing = await db.execute(
        select(AssessmentResult).where(AssessmentResult.session_id == uuid.UUID(session_id))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 평가가 제출되었습니다.")

    # 점수 산출
    answers_dict = body.answers.model_dump()
    scores = compute_scores(answers_dict)

    assessment = AssessmentResult(
        id=uuid.uuid4(),
        session_id=uuid.UUID(session_id),
        user_id=uuid.UUID(current_user.sub),
        answers=answers_dict,
        phq_score=scores["phq_score"],
        gad_score=scores["gad_score"],
        suicide_flag=scores["suicide_flag"],
        initial_risk_level=scores["initial_risk_level"],
        chief_complaint=body.chief_complaint,
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)

    logger.info(
        "assessment_submitted",
        session_id=session_id,
        phq=scores["phq_score"],
        gad=scores["gad_score"],
        risk=scores["initial_risk_level"],
        suicide_flag=scores["suicide_flag"],
    )

    return AssessmentResponse(
        id=str(assessment.id),
        session_id=str(assessment.session_id),
        phq_score=assessment.phq_score,
        gad_score=assessment.gad_score,
        suicide_flag=assessment.suicide_flag,
        initial_risk_level=assessment.initial_risk_level,
        chief_complaint=assessment.chief_complaint,
    )


@router.get("/{session_id}/assessment", response_model=AssessmentResponse)
async def get_assessment(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """세션의 초기 평가 결과 조회."""
    # 소유권 확인 (상담사/관리자는 모든 세션 허용)
    if current_user.role not in ("counselor", "admin"):
        session_result = await db.execute(
            select(Session).where(
                Session.id == uuid.UUID(session_id),
                Session.user_id == uuid.UUID(current_user.sub),
            )
        )
        if not session_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    result = await db.execute(
        select(AssessmentResult).where(AssessmentResult.session_id == uuid.UUID(session_id))
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="평가 결과가 없습니다.")

    return AssessmentResponse(
        id=str(assessment.id),
        session_id=str(assessment.session_id),
        phq_score=assessment.phq_score,
        gad_score=assessment.gad_score,
        suicide_flag=assessment.suicide_flag,
        initial_risk_level=assessment.initial_risk_level,
        chief_complaint=assessment.chief_complaint,
    )


class GreetingResponse(BaseModel):
    content: str
    follow_ups: list[dict]   # 추천 심화 테스트 목록 [{ type, reason, priority }]


# ── 그리팅 프롬프트 ────────────────────────────────────────────────

_GREETING_SYSTEM = """당신은 따뜻하고 공감 능력이 뛰어난 정신건강 상담 전문가입니다.
환자가 방금 초기 정신건강 선별 검사를 완료했습니다.

당신의 역할:
의사가 환자와 함께 검사지를 보며 이야기하듯, 환자가 직접 답한 내용을 하나씩 읽어주면서 자연스럽게 대화를 시작하세요.
단순히 "경증이에요"처럼 요약하는 게 아니라, 환자가 표시한 구체적인 항목들을 언급하며 공감해 주세요.

반드시 지켜야 할 원칙:
1. 환자가 응답한 내용을 직접 언급하세요.
   예: "요즘 기분이 가라앉는 날이 일주일 이상 지속되셨다고 하셨네요."
       "수면도 거의 매일 힘드셨다고 하셨고요."
       "불안하고 초조한 느낌도 며칠 있으셨다고 하셨네요."
2. '전혀 없음(0점)'으로 답한 항목은 언급하지 마세요. 어려움이 있는 항목만 이야기하세요.
3. 숫자나 점수, 진단명은 절대 언급하지 마세요.
4. 자해/자살 응답이 있으면 다른 내용보다 먼저, 조심스럽고 따뜻하게 안전을 확인하세요.
5. 추가 검사가 필요하면 마지막에 자연스럽게 권유하세요.
6. 전체 흐름: 관찰한 내용 언급 → 공감 → 오늘 상담 주제 연결 → 열린 질문
7. 말투는 딱딱하지 않게, 친근하고 따뜻하게. "~네요", "~셨겠어요", "~이야기해볼까요?" 스타일."""


def _build_greeting_prompt(ar) -> str:
    """
    각 문항의 실제 답변 내용을 LLM에게 전달한다.
    LLM이 환자가 직접 답한 내용을 읽어주듯 대화형으로 안내할 수 있도록
    문항 텍스트 + 응답 빈도를 그대로 넘긴다.
    """
    answers = ar.answers or {}

    # 응답이 있는 문항 (1점 이상) — 문항 텍스트 + 빈도 언어
    answered_items = []
    for key, label in QUESTION_LABELS.items():
        if key == "q9":
            continue  # 자해/자살은 별도 처리
        score = answers.get(key, 0)
        if score >= 1:
            answered_items.append(f'  - "{label}" → {SCALE_LABELS[score]}')

    lines = ["[환자가 직접 답한 검사 내용 — 이 내용을 바탕으로 대화형으로 안내하세요]"]

    if ar.suicide_flag:
        suicide_score = answers.get("q9", 0)
        lines.append(
            f"⚠️ 자해/자살 사고: {SCALE_LABELS.get(suicide_score, '응답 있음')} — 반드시 먼저, 조심스럽게 안전을 확인하세요."
        )

    if answered_items:
        lines.append("\n증상 관련 응답 (직접 언급해 주세요):")
        lines.extend(answered_items)
    else:
        lines.append("\n모든 증상 항목에 '전혀 없음'으로 응답했습니다. 전반적으로 안정적임을 따뜻하게 전달하세요.")

    if ar.chief_complaint:
        lines.append(f"\n오늘 상담 주제 (검사 결과와 연결지어 언급): {ar.chief_complaint}")

    phq, gad = ar.phq_score, ar.gad_score
    follow_ups = recommend_followups(phq, gad, ar.suicide_flag, answers)
    if follow_ups:
        types_kr = {
            "crisis_detailed": "자해/자살에 대해 조금 더 구체적으로 여쭤봐도 될지",
            "phq_extended": "우울 관련해서 몇 가지 추가로 여쭤봐도 될지",
            "gad_extended": "불안 관련해서 몇 가지 추가로 여쭤봐도 될지",
        }
        suggestions = [types_kr.get(f["type"], "") for f in follow_ups if types_kr.get(f["type"])]
        lines.append(f"\n추가 확인 권유 (마지막에 자연스럽게): {' / '.join(suggestions)}")

    return "\n".join(lines)


@router.post("/{session_id}/greeting", response_model=GreetingResponse)
async def generate_greeting(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    설문 완료 직후 AI가 결과를 안내하며 상담을 시작하는 오프닝 메시지 생성.
    결과를 구체적으로 설명하고, 심화 테스트 필요 여부를 함께 반환한다.
    """
    session_result = await db.execute(
        select(Session).where(
            Session.id == uuid.UUID(session_id),
            Session.user_id == uuid.UUID(current_user.sub),
        )
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    ar_result = await db.execute(
        select(AssessmentResult).where(AssessmentResult.session_id == uuid.UUID(session_id))
    )
    ar = ar_result.scalar_one_or_none()
    if not ar:
        raise HTTPException(status_code=404, detail="평가 결과가 없습니다.")

    follow_ups = recommend_followups(ar.phq_score, ar.gad_score, ar.suicide_flag, ar.answers or {})

    settings = get_settings()
    llm = ChatOpenAI(model=settings.active_model, temperature=0.7)

    prompt = _build_greeting_prompt(ar)
    try:
        response = await llm.ainvoke([
            SystemMessage(content=_GREETING_SYSTEM),
            HumanMessage(content=prompt),
        ])
        content = response.content
    except Exception as e:
        logger.error("greeting_generation_failed", error=str(e))
        content = "안녕하세요. 설문 결과를 확인했습니다. 오늘 어떤 이야기를 나눠볼까요?"

    logger.info("greeting_generated", session_id=session_id, follow_ups_count=len(follow_ups))
    return GreetingResponse(content=content, follow_ups=follow_ups)


# ── 심화 테스트 ────────────────────────────────────────────────────

@router.get("/{session_id}/followup/{followup_type}")
async def get_followup_questions_endpoint(
    session_id: str,  # noqa: ARG001
    followup_type: str,
    current_user: TokenPayload = Depends(get_current_user),  # noqa: ARG001
):
    """심화 테스트 문항 목록 반환."""
    valid_types = ("phq_extended", "gad_extended", "crisis_detailed")
    if followup_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 테스트 유형입니다. 가능한 값: {valid_types}")
    return {"followup_type": followup_type, "questions": get_followup_questions(followup_type)}  # type: ignore[arg-type]


@router.post("/{session_id}/followup", response_model=FollowUpResponse)
async def submit_followup(
    session_id: str,
    body: FollowUpSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    심화 테스트 응답 제출 및 위험도 재산출.
    crisis_detailed: 이진 응답(0/1) → 위험도 즉시 상향.
    phq/gad_extended: 추가 점수를 기존 점수에 합산하여 위험도 재산출.
    """
    # 세션 + 초기 평가 확인
    session_result = await db.execute(
        select(Session).where(
            Session.id == uuid.UUID(session_id),
            Session.user_id == uuid.UUID(current_user.sub),
        )
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    ar_result = await db.execute(
        select(AssessmentResult).where(AssessmentResult.session_id == uuid.UUID(session_id))
    )
    ar = ar_result.scalar_one_or_none()
    if not ar:
        raise HTTPException(status_code=404, detail="초기 평가 결과가 없습니다.")

    additional_score = sum(body.answers.values())
    updated_risk = ar.initial_risk_level

    if body.followup_type == "crisis_detailed":
        # cd2(구체적 방법) or cd3(의향) or cd4(과거 시도) 중 하나라도 1이면 위험도 최소 8
        if any(body.answers.get(k, 0) >= 1 for k in ("cd2", "cd3", "cd4")):
            updated_risk = max(updated_risk, 8)
        elif body.answers.get("cd1", 0) >= 2:
            updated_risk = max(updated_risk, 7)

    elif body.followup_type == "phq_extended":
        # 추가 점수를 PHQ에 합산 후 위험도 재산출
        new_phq = ar.phq_score + additional_score
        phq_norm = min(new_phq / 24 * 10, 10)  # 확장 PHQ 최대 24점
        gad_norm = min(ar.gad_score / 9 * 10, 10)
        updated_risk = min(round(phq_norm * 0.6 + gad_norm * 0.4), 10)
        if ar.suicide_flag:
            updated_risk = max(updated_risk, 7)

    elif body.followup_type == "gad_extended":
        new_gad = ar.gad_score + additional_score
        phq_norm = min(ar.phq_score / 15 * 10, 10)
        gad_norm = min(new_gad / 21 * 10, 10)  # 확장 GAD 최대 21점
        updated_risk = min(round(phq_norm * 0.6 + gad_norm * 0.4), 10)
        if ar.suicide_flag:
            updated_risk = max(updated_risk, 7)

    # 위험도 갱신
    ar.initial_risk_level = updated_risk
    await db.commit()

    logger.info(
        "followup_submitted",
        session_id=session_id,
        type=body.followup_type,
        additional_score=additional_score,
        updated_risk=updated_risk,
    )

    return FollowUpResponse(
        followup_type=body.followup_type,
        answers=body.answers,
        additional_score=additional_score,
        updated_risk_level=updated_risk,
    )
