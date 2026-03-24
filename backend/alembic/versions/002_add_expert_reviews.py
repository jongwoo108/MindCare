"""add expert_reviews table

Revision ID: 002
Revises: 001
Create Date: 2026-03-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expert_reviews",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ai_response", sa.Text(), nullable=False),
        sa.Column("risk_level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("risk_factors", sa.JSON(), nullable=True),
        sa.Column("context_summary", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "modified", name="review_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("reviewer_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("modified_content", sa.Text(), nullable=True),
        sa.Column(
            "feedback_category",
            sa.Enum("response_quality", "safety", "clinical_accuracy", name="feedback_category"),
            nullable=True,
        ),
        sa.Column("feedback_note", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_expert_reviews_session_id", "expert_reviews", ["session_id"])
    op.create_index("ix_expert_reviews_user_id", "expert_reviews", ["user_id"])
    op.create_index("ix_expert_reviews_status", "expert_reviews", ["status"])


def downgrade() -> None:
    op.drop_table("expert_reviews")
    op.execute("DROP TYPE IF EXISTS review_status")
    op.execute("DROP TYPE IF EXISTS feedback_category")
