import uuid
from sqlalchemy import String, Text, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class PatientCase(Base, TimestampMixin):
    """
    AI 상담 세션 종료 후 자동 생성되는 익명화 케이스 카드.
    의사들이 케이스 게시판에서 조회하고 매칭 요청을 보낼 수 있다.
    개인 식별 정보는 포함하지 않는다.
    """
    __tablename__ = "patient_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    # 익명화 요약 (SOAP 노트에서 추출, 식별 정보 제거)
    summary: Mapped[str] = mapped_column(Text, nullable=False)

    # 주 호소 문제 키워드 (예: ["우울", "수면 문제", "대인관계"])
    keywords: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # 위험 수준 (언어적 표현)
    risk_label: Mapped[str] = mapped_column(String(30), nullable=False, default="안정")
    risk_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # 추천 전문 분야 태그 (매칭 필터링용)
    recommended_specialties: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # 매칭 상태
    is_matched: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    match: Mapped["DoctorPatientMatch | None"] = relationship(  # noqa: F821
        "DoctorPatientMatch", back_populates="patient_case", uselist=False
    )
