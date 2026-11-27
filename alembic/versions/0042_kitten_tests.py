"""Tests: the thirsty kitten in the desert (a secret achievement and the Pharaoh Cat)

Revision ID: 0042
Revises: 0041
"""
import sqlalchemy as sa
from alembic import op

revision = "0042"
down_revision = "0041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "kitten_tests",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answer", sa.String(8), nullable=False, server_default=""),
        sa.Column("gems", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_kitten_tests_member_id", "kitten_tests", ["member_id"])


def downgrade() -> None:
    op.drop_index("ix_kitten_tests_member_id", "kitten_tests")
    op.drop_table("kitten_tests")
