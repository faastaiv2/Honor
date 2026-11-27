"""Tasks get harder by rank instead of every day; some tasks appear only from a rank on

Daily growth stops: each task keeps the number it has reached today (that becomes its Bronze number), and gets
a per-rank step. The admin can change both in the Tasks tab.

Revision ID: 0045
Revises: 0044
"""
from datetime import date

import sqlalchemy as sa
from alembic import op

revision = "0045"
down_revision = "0044"
branch_labels = None
depends_on = None

RANK_STEPS = {"darood": 25, "pages": 1, "jj": 10, "push": 2, "sit": 2, "plank": 5, "mc": 5}


def upgrade() -> None:
    with op.batch_alter_table("tasks") as b:
        b.add_column(sa.Column("rank_step", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("min_rank", sa.String(12), nullable=False, server_default=""))
    conn = op.get_bind()
    today = date.today()
    rows = conn.execute(sa.text("SELECT key, number, step, every, start_day FROM tasks")).fetchall()
    for key, number, step, every, start in rows:
        if number is None:
            continue
        if isinstance(start, str):
            start = date.fromisoformat(start[:10])
        now = number + (step or 0) * (max(0, (today - start).days) // max(1, every or 1)) if step else number
        conn.execute(sa.text("UPDATE tasks SET number = :n, step = 0, rank_step = :r, start_day = :d WHERE key = :k"),
                     {"n": max(0, now), "r": RANK_STEPS.get(key, 0), "d": today, "k": key})


def downgrade() -> None:
    with op.batch_alter_table("tasks") as b:
        b.drop_column("min_rank")
        b.drop_column("rank_step")
