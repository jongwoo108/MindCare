import uuid
from sqlalchemy import String, Integer, Text, Enum as SAEnum, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(
        SAEnum("user", "assistant", "system", name="message_role"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Phase 2: AES-256 암호화 예정
    agent_type: Mapped[str | None] = mapped_column(
        SAEnum("triage", "counseling", "crisis", name="agent_type"), nullable=True
    )
    risk_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    session: Mapped["Session"] = relationship("Session", back_populates="messages")  # noqa: F821
