from typing import Optional, Literal
from pydantic import BaseModel, Field, model_validator


# ── 초기 평가 문항 정의 ─────────────────────────────────────────────

PHQ_QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5"]   # 우울 (PHQ-9 단축)
GAD_QUESTION_KEYS = ["q6", "q7", "q8"]                 # 불안 (GAD-7 단축)
SUICIDE_KEY = "q9"                                     # 자해/자살 관련

# 각 문항의 한국어 텍스트 (프롬프트 생성용)
QUESTION_LABELS = {
    "q1": "기분이 가라앉거나 우울하거나 희망이 없는 느낌",
    "q2": "일이나 여가 활동에 흥미나 즐거움 감소",
    "q3": "수면 문제 (잠들기 어려움 / 자주 깸 / 과수면)",
    "q4": "피로하거나 기운 없음",
    "q5": "자기 비난 또는 실패감",
    "q6": "초조함 / 불안 / 긴장",
    "q7": "걱정을 멈추거나 조절하기 어려움",
    "q8": "쉽게 짜증이 나거나 분노",
    "q9": "자해 또는 죽고 싶다는 생각",
}

SCALE_LABELS = {0: "전혀 없음", 1: "며칠", 2: "일주일 이상", 3: "거의 매일"}


# ── 심화 테스트 문항 정의 ───────────────────────────────────────────

# PHQ-9 나머지 3문항 (초기 선별에서 빠진 식욕/집중/정신운동)
PHQ_EXTENDED_QUESTIONS = [
    {"key": "pe1", "text": "식욕이 없거나, 반대로 너무 많이 드셨나요?"},
    {"key": "pe2", "text": "신문, 책, TV 등에 집중하기 어려우셨나요?"},
    {"key": "pe3", "text": "말이나 행동이 평소보다 느려지거나, 반대로 너무 안절부절 못하셨나요?"},
]

# GAD-7 나머지 4문항
GAD_EXTENDED_QUESTIONS = [
    {"key": "ge1", "text": "편안하게 쉬기가 어려우셨나요?"},
    {"key": "ge2", "text": "가만히 있기 힘들 정도로 안절부절 못하셨나요?"},
    {"key": "ge3", "text": "나쁜 일이 생길 것 같은 막연한 두려움이 있으셨나요?"},
    {"key": "ge4", "text": "다양한 걱정거리들 때문에 너무 많이 걱정하셨나요?"},
]

# 자해/자살 상세 위험 평가 (C-SSRS 간략형 기반, 0=아니오 / 1=예)
CRISIS_DETAILED_QUESTIONS = [
    {"key": "cd1", "text": "죽고 싶다는 생각이 얼마나 자주 드셨나요? (0=전혀 없음 ~ 3=거의 매일)"},
    {"key": "cd2", "text": "스스로를 해치는 구체적인 방법에 대해 생각해 보신 적 있으신가요?", "scale": "binary"},
    {"key": "cd3", "text": "이런 생각을 실제로 행동에 옮길 의향이 있으셨나요?", "scale": "binary"},
    {"key": "cd4", "text": "이전에 자해나 자살을 시도한 적이 있으신가요?", "scale": "binary"},
]

FollowUpType = Literal["phq_extended", "gad_extended", "crisis_detailed"]


def get_followup_questions(followup_type: FollowUpType) -> list[dict]:
    mapping = {
        "phq_extended": PHQ_EXTENDED_QUESTIONS,
        "gad_extended": GAD_EXTENDED_QUESTIONS,
        "crisis_detailed": CRISIS_DETAILED_QUESTIONS,
    }
    return mapping[followup_type]


# ── 점수 산출 ────────────────────────────────────────────────────────

def compute_scores(answers: dict) -> dict:
    """
    문항 응답(0-3)으로부터 PHQ 점수, GAD 점수, 자살 플래그, 초기 위험도를 산출.
    PHQ 60% + GAD 40% 가중 평균 → 0-10 스케일.
    자살/자해 응답 ≥ 1 → 위험도 최소 7 강제.
    """
    phq = sum(answers.get(k, 0) for k in PHQ_QUESTION_KEYS)
    gad = sum(answers.get(k, 0) for k in GAD_QUESTION_KEYS)
    suicide_flag = answers.get(SUICIDE_KEY, 0) >= 1

    phq_norm = min(phq / 15 * 10, 10)
    gad_norm = min(gad / 9 * 10, 10)
    base_risk = round(phq_norm * 0.6 + gad_norm * 0.4)

    if suicide_flag:
        base_risk = max(base_risk, 7)

    return {
        "phq_score": phq,
        "gad_score": gad,
        "suicide_flag": suicide_flag,
        "initial_risk_level": min(base_risk, 10),
    }


def recommend_followups(phq: int, gad: int, suicide_flag: bool, answers: dict) -> list[dict]:
    """
    초기 평가 결과를 바탕으로 필요한 심화 테스트 목록을 반환.
    각 항목: { type, reason, priority }
    """
    recs = []

    # 자해/자살 플래그 → 최우선 위기 심층 평가
    if suicide_flag or answers.get(SUICIDE_KEY, 0) >= 1:
        recs.append({
            "type": "crisis_detailed",
            "reason": "조금 더 세심하게 마음 상태를 살펴보고 싶어서요. 편하게 답해 주셔도 괜찮아요.",
            "priority": 1,
        })

    # PHQ ≥ 5 → 우울 심화 평가
    if phq >= 5:
        recs.append({
            "type": "phq_extended",
            "reason": "요즘 힘드셨던 부분을 조금 더 이야기 나눠봐도 될까요? 몇 가지만 더 여쭤볼게요.",
            "priority": 2,
        })

    # GAD ≥ 4 → 불안 심화 평가
    if gad >= 4:
        recs.append({
            "type": "gad_extended",
            "reason": "불안하거나 긴장되는 부분에 대해 조금 더 파악하면 도움이 될 것 같아요.",
            "priority": 3,
        })

    return sorted(recs, key=lambda x: x["priority"])


# ── Pydantic 스키마 ────────────────────────────────────────────────

class AssessmentAnswers(BaseModel):
    """초기 9문항 응답 (각 0-3)."""
    q1: int = Field(..., ge=0, le=3)
    q2: int = Field(..., ge=0, le=3)
    q3: int = Field(..., ge=0, le=3)
    q4: int = Field(..., ge=0, le=3)
    q5: int = Field(..., ge=0, le=3)
    q6: int = Field(..., ge=0, le=3)
    q7: int = Field(..., ge=0, le=3)
    q8: int = Field(..., ge=0, le=3)
    q9: int = Field(..., ge=0, le=3)


class AssessmentSubmit(BaseModel):
    answers: AssessmentAnswers
    chief_complaint: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_answers(self):
        return self


class AssessmentResponse(BaseModel):
    id: str
    session_id: str
    phq_score: int
    gad_score: int
    suicide_flag: bool
    initial_risk_level: int
    chief_complaint: Optional[str]

    model_config = {"from_attributes": True}


class FollowUpSubmit(BaseModel):
    """심화 테스트 응답 제출."""
    followup_type: FollowUpType
    answers: dict[str, int]  # {"pe1": 2, "pe2": 1, ...}


class FollowUpResponse(BaseModel):
    followup_type: str
    answers: dict
    additional_score: int   # 심화 문항 합산
    updated_risk_level: int  # 재산출된 위험도
