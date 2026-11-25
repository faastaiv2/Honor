"""tasks that can't be ticked before a time of day; breaking it means swearing the oath again

Revision ID: 0013
Revises: 0012
"""
import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as b:
        b.add_column(sa.Column("not_before", sa.String(5), nullable=True))
    op.execute(sa.text("UPDATE tasks SET not_before = '12:00' WHERE key = 'asr'"))
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("oath_note", sa.String(160), nullable=False, server_default=""))
        b.add_column(sa.Column("early_ticks", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.drop_column("early_ticks")
        b.drop_column("oath_note")
    with op.batch_alter_table("tasks") as b:
        b.drop_column("not_before")
