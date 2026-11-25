"""avatars, Legendary quests, make-up ticks

Revision ID: 0002
Revises: 0001
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("avatar", sa.String(16), nullable=False, server_default=""))
        b.add_column(sa.Column("quest_starts", sa.JSON(), nullable=False, server_default="[]"))
    with op.batch_alter_table("day_logs") as b:
        b.add_column(sa.Column("late", sa.JSON(), nullable=False, server_default="{}"))


def downgrade() -> None:
    with op.batch_alter_table("day_logs") as b:
        b.drop_column("late")
    with op.batch_alter_table("members") as b:
        b.drop_column("quest_starts")
        b.drop_column("avatar")
