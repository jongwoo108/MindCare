"""add doctor platform tables

Revision ID: 005
Revises: 004
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. users 테이블의 role enum에 'doctor' 추가
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'doctor'")

    # 2. doctor_profiles
    op.create_table(
        "doctor_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("license_number", sa.String(50), nullable=False, unique=True),
        sa.Column("hospital", sa.String(200), nullable=False),
        sa.Column("department", sa.String(100), nullable=False, server_default="정신건강의학과"),
        sa.Column("specialties", JSON(), nullable=False, server_default="[]"),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("max_patients", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_accepting", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_doctor_profiles_user_id", "doctor_profiles", ["user_id"])

    # 3. patient_cases
    op.create_table(
        "patient_cases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("keywords", JSON(), nullable=False, server_default="[]"),
        sa.Column("risk_label", sa.String(30), nullable=False, server_default="안정"),
        sa.Column("risk_level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("recommended_specialties", JSON(), nullable=False, server_default="[]"),
        sa.Column("is_matched", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_patient_cases_session_id", "patient_cases", ["session_id"])
    op.create_index("ix_patient_cases_user_id", "patient_cases", ["user_id"])

    # 4. doctor_patient_matches
    op.create_table(
        "doctor_patient_matches",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("doctor_id", UUID(as_uuid=True), sa.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_case_id", UUID(as_uuid=True), sa.ForeignKey("patient_cases.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("doctor_message", sa.Text(), nullable=True),
        sa.Column("patient_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_doctor_patient_matches_doctor_id", "doctor_patient_matches", ["doctor_id"])
    op.create_index("ix_doctor_patient_matches_user_id", "doctor_patient_matches", ["user_id"])


def downgrade() -> None:
    op.drop_table("doctor_patient_matches")
    op.drop_table("patient_cases")
    op.drop_table("doctor_profiles")
