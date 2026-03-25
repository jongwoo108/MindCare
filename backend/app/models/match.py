import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class DoctorPatientMatch(Base, TimestampMixin):
    """
    의사가 케이스 게시판에서 환자를 선택(요청)하고, 환자가 수락/거절하는 매칭 테이블.
    의사 → 요청 → 환자 수락/거절 플로우.
    """
    __tablename__ = "doctor_patient_matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("doctor_profiles.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    patient_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_cases.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    # pending → accepted | rejected | cancelled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    # 의사가 환자에게 보내는 소개 메시지
    doctor_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 환자 응답 메시지 (선택)
    patient_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="matches")  # noqa: F821
    patient_case: Mapped["PatientCase"] = relationship("PatientCase", back_populates="match")  # noqa: F821
