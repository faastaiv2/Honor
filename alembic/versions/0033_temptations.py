"""Tests: Shaytan's offer

Revision ID: 0033
Revises: 0032
"""
import sqlalchemy as sa
from alembic import op

revision = "0033"
down_revision = "0032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "temptations",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("offer", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("answer", sa.String(8), nullable=False, server_default=""),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cut", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cut_seen", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("reward", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reward_seen", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("posted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_by", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_temptations_member_id", "temptations", ["member_id"])


def downgrade() -> None:
    op.drop_index("ix_temptations_member_id", "temptations")
    op.drop_table("temptations")
