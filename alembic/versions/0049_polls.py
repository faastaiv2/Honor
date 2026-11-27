"""Polls and surveys the admin asks the family

Revision ID: 0049
Revises: 0048
"""
import sqlalchemy as sa
from alembic import op

revision = "0049"
down_revision = "0048"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "polls",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("question", sa.String(200), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("multi", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("anonymous", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("show_results", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("closed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_by", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "poll_votes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("poll_id", sa.String(32), sa.ForeignKey("polls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("choices", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("poll_id", "member_id", name="uq_poll_vote"),
    )
    op.create_index("ix_poll_votes_poll_id", "poll_votes", ["poll_id"])


def downgrade() -> None:
    op.drop_index("ix_poll_votes_poll_id", "poll_votes")
    op.drop_table("poll_votes")
    op.drop_table("polls")
