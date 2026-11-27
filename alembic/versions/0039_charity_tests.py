"""Tests: the man in the cloak who begs for gems (sadaqah)

Revision ID: 0039
Revises: 0038
"""
import sqlalchemy as sa
from alembic import op

revision = "0039"
down_revision = "0038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "charity_tests",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ask", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("give_back", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("answer", sa.String(8), nullable=False, server_default=""),
        sa.Column("given", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_charity_tests_member_id", "charity_tests", ["member_id"])


def downgrade() -> None:
    op.drop_index("ix_charity_tests_member_id", "charity_tests")
    op.drop_table("charity_tests")
