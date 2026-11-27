"""The admin can remind a member to set their avatar; members see who liked their posts since they last looked

Revision ID: 0037
Revises: 0036
"""
import sqlalchemy as sa
from alembic import op

revision = "0037"
down_revision = "0036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("avatar_nudge", sa.Boolean(), nullable=False, server_default=sa.false()))
        b.add_column(sa.Column("likes_seen_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.drop_column("likes_seen_at")
        b.drop_column("avatar_nudge")
