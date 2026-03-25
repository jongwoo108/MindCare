import uuid
from datetime import datetime
from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base


class AssessmentResult(Base):
    """
    세션 시작 시 사용자가 응답한 정신건강 초기 평가 결과.
    PHQ-9 (우울) + GAD-7 (불안) 기반 단축형 9문항 + 자유 입력 1문항.
    """
    __tablename__ = "assessment_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # 문항별 응답 (0=전혀없음, 1=며칠, 2=일주일이상, 3=거의매일)
    answers: Mapped[dict] = mapped_column(JSON, nullable=False)  # {"q1": 0, "q2": 1, ...}

    # 산출 점수
    phq_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)   # PHQ 문항 합산 (0-15)
    gad_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)   # GAD 문항 합산 (0-9)
    suicide_flag: Mapped[bool] = mapped_column(default=False, nullable=False)    # Q9 ≥ 1
    initial_risk_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0-10

    # 자유 서술 (오늘 상담 주제)
    chief_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
