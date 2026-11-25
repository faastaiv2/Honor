"""special periods (tasks off or smaller) and excuses for single tasks

Revision ID: 0010
Revises: 0009
"""
import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "periods",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("start", sa.Date(), nullable=False),
        sa.Column("end", sa.Date(), nullable=False),
        sa.Column("off", sa.JSON(), nullable=False),
        sa.Column("numbers", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    with op.batch_alter_table("day_logs") as b:
        b.add_column(sa.Column("task_excuses", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("day_logs") as b:
        b.drop_column("task_excuses")
    op.drop_table("periods")
