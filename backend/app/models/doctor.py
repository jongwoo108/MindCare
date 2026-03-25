import uuid
from sqlalchemy import String, Text, Boolean, Integer, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class DoctorProfile(Base, TimestampMixin):
    """
    정신과 의사 프로필.
    role='doctor'인 User가 직접 가입 후 생성.
    케이스 게시판에서 환자를 선택(매칭 요청)하는 주체.
    """
    __tablename__ = "doctor_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )

    license_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    hospital: Mapped[str] = mapped_column(String(200), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False, default="정신건강의학과")

    # 전문 분야 태그 (예: ["우울증", "불안장애", "PTSD", "청소년"])
    specialties: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_patients: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # admin 승인 여부 / 신규 환자 수락 여부
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_accepting: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    matches: Mapped[list["DoctorPatientMatch"]] = relationship("DoctorPatientMatch", back_populates="doctor")  # noqa: F821
