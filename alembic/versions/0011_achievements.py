"""achievement rewards collected

Revision ID: 0011
Revises: 0010
"""
import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "achievement_claims",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("key", sa.String(24), nullable=False),
        sa.Column("gems", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("member_id", "key", name="uq_member_achievement"),
    )


def downgrade() -> None:
    op.drop_table("achievement_claims")
