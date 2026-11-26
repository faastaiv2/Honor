"""members can take gems from someone on the Pillar of Shame

Revision ID: 0024
Revises: 0023
"""
import sqlalchemy as sa
from alembic import op

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gem_takes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("taker_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("victim_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("gems", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("taker_id", "victim_id", "day", name="uq_take_pair_day"),
    )


def downgrade() -> None:
    op.drop_table("gem_takes")
