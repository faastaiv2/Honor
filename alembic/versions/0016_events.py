"""art tournaments the admin creates, and their entries

Revision ID: 0016
Revises: 0015
"""
import sqlalchemy as sa
from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("day", sa.Date(), nullable=False, unique=True),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("prompt", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "event_entries",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("event_day", sa.Date(), nullable=False, index=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("mime", sa.String(20), nullable=False),
        sa.Column("image", sa.LargeBinary(), nullable=False),
        sa.Column("place", sa.Integer(), nullable=True),
        sa.Column("gems", sa.Integer(), nullable=False),
        sa.Column("win_seen", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("event_day", "member_id", name="uq_event_member"),
    )


def downgrade() -> None:
    op.drop_table("event_entries")
    op.drop_table("events")
