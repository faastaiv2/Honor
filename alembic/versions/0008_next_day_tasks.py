"""tasks done at night that count for the next day (Surah Mulk)

Revision ID: 0008
Revises: 0007
"""
import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as b:
        b.add_column(sa.Column("next_day", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute(sa.text("UPDATE tasks SET next_day = :yes WHERE key = 'mulk'").bindparams(yes=True))


def downgrade() -> None:
    with op.batch_alter_table("tasks") as b:
        b.drop_column("next_day")
