"""Legendary quest settings: the prize, gems per quest day, and each task's number on the quest

Revision ID: 0050
Revises: 0049
"""
import sqlalchemy as sa
from alembic import op

revision = "0050"
down_revision = "0049"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("app_settings") as b:
        b.add_column(sa.Column("legendary_gems", sa.Integer(), nullable=False, server_default="1000"))
        b.add_column(sa.Column("quest_day_gems", sa.Integer(), nullable=False, server_default="0"))
    with op.batch_alter_table("tasks") as b:
        b.add_column(sa.Column("quest_number", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("tasks") as b:
        b.drop_column("quest_number")
    with op.batch_alter_table("app_settings") as b:
        b.drop_column("quest_day_gems")
        b.drop_column("legendary_gems")
