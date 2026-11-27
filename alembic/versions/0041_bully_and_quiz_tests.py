"""Tests: the rude kid (Gentle Heart) and the owl's quiz scroll

Revision ID: 0041
Revises: 0040
"""
import sqlalchemy as sa
from alembic import op

revision = "0041"
down_revision = "0040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bully_tests",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answer", sa.String(8), nullable=False, server_default=""),
        sa.Column("paid", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_bully_tests_member_id", "bully_tests", ["member_id"])
    op.create_table(
        "quiz_tests",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("gems_each", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_quiz_tests_member_id", "quiz_tests", ["member_id"])


def downgrade() -> None:
    op.drop_index("ix_quiz_tests_member_id", "quiz_tests")
    op.drop_table("quiz_tests")
    op.drop_index("ix_bully_tests_member_id", "bully_tests")
    op.drop_table("bully_tests")
