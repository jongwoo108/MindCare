import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Enum as SAEnum, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class Session(Base, TimestampMixin):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        SAEnum("active", "closed", "crisis", name="session_status"),
        nullable=False,
        default="active",
    )
    therapeutic_approach: Mapped[str | None] = mapped_column(String(50), nullable=True)
    risk_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    message_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="sessions")  # noqa: F821
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="session", cascade="all, delete-orphan")  # noqa: F821
