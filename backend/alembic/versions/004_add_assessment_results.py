"""add assessment_results table

Revision ID: 004
Revises: 003
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assessment_results",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answers", JSON(), nullable=False),
        sa.Column("phq_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("gad_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("suicide_flag", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("initial_risk_level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chief_complaint", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_assessment_results_session_id", "assessment_results", ["session_id"])
    op.create_index("ix_assessment_results_user_id", "assessment_results", ["user_id"])


def downgrade() -> None:
    op.drop_table("assessment_results")
