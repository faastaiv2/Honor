"""Launch Gobi: a cauliflower at someone on the Pillar of Shame, +10 gems once a day

Revision ID: 0032
Revises: 0031
"""
import sqlalchemy as sa
from alembic import op

revision = "0032"
down_revision = "0031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gobi_launches",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("launcher_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("victim_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("gems", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("launcher_id", "day", name="uq_gobi_launcher_day"),
    )
    op.create_index("ix_gobi_launches_launcher_id", "gobi_launches", ["launcher_id"])
    op.create_index("ix_gobi_launches_victim_id", "gobi_launches", ["victim_id"])


def downgrade() -> None:
    op.drop_index("ix_gobi_launches_victim_id", "gobi_launches")
    op.drop_index("ix_gobi_launches_launcher_id", "gobi_launches")
    op.drop_table("gobi_launches")
