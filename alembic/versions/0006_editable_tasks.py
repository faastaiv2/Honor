"""daily tasks the admin can edit, seeded with the sheet's tasks

Revision ID: 0006
Revises: 0005
"""
import sqlalchemy as sa
from alembic import op

from app.scoring import DEFAULT_SPECS

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    tasks = op.create_table(
        "tasks",
        sa.Column("key", sa.String(24), primary_key=True),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("group", sa.String(40), nullable=False),
        sa.Column("fitness", sa.Boolean(), nullable=False),
        sa.Column("number", sa.Integer(), nullable=True),
        sa.Column("step", sa.Integer(), nullable=False),
        sa.Column("every", sa.Integer(), nullable=False),
        sa.Column("start_day", sa.Date(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
    )
    op.bulk_insert(tasks, [
        {"key": t.key, "label": t.label, "group": t.group, "fitness": t.fitness, "number": t.number,
         "step": t.step, "every": t.every, "start_day": t.start_day, "sort_order": i}
        for i, t in enumerate(DEFAULT_SPECS)
    ])


def downgrade() -> None:
    op.drop_table("tasks")
