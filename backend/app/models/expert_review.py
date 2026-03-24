import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, Enum as SAEnum, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class ExpertReview(Base, TimestampMixin):
    """
    고위험 세션(risk_level >= expert_review_threshold)에서 AI 응답을
    전문가가 승인·수정하는 대기열 레코드.

    상태 흐름: pending → approved | modified
    """
    __tablename__ = "expert_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 어느 세션의 어느 사용자 메시지에 대한 응답인가
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # AI가 생성한 원본 응답
    ai_response: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_factors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    context_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 검토 상태
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "approved", "modified", name="review_status"),
        nullable=False,
        default="pending",
        index=True,
    )

    # 전문가 결정
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    modified_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback_category: Mapped[str | None] = mapped_column(
        SAEnum("response_quality", "safety", "clinical_accuracy", name="feedback_category"),
        nullable=True,
    )
    feedback_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
