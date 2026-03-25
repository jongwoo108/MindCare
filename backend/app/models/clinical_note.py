import uuid
from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class ClinicalNote(Base, TimestampMixin):
    """
    SOAP 형식 자동 생성 임상 노트.

    세션 종료(WebSocket disconnect) 시 LLM이 대화 내용을 분석해 생성한다.
    상담사/관리자 전용 조회 (GET /sessions/{id}/clinical-notes).

    SOAP 구조:
      Subjective  — 내담자가 직접 호소한 내용 (주관적 증상, 감정)
      Objective   — 관찰 가능한 데이터 (위험도, 메시지 수, 에이전트 유형)
      Assessment  — 임상적 평가 (위험 수준 해석, 치료 효과)
      Plan        — 다음 세션 방향 (치료 목표, 권장 접근법)
    """
    __tablename__ = "clinical_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # SOAP 섹션
    subjective: Mapped[str] = mapped_column(Text, nullable=False)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    assessment: Mapped[str] = mapped_column(Text, nullable=False)
    plan: Mapped[str] = mapped_column(Text, nullable=False)

    # 메타데이터
    risk_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    therapeutic_approach: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
