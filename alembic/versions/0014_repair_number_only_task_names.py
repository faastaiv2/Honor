"""repair tasks whose name was replaced by a number

In the old task editor the name box showed "# laps"; typing the wanted number there left names like "{n} 1"
(shown as "2 1"). For each such task from the original sheet: put the original name back and make the typed
number today's number. How often it grows is kept as the admin set it.

Revision ID: 0014
Revises: 0013
"""
import re
from datetime import date

import sqlalchemy as sa
from alembic import op

from app.scoring import DEFAULT_SPECS

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None

NUMBER_ONLY = re.compile(r"^\s*(\{n\})?\s*(\d+)\s*(\{n\})?\s*$")


def upgrade() -> None:
    conn = op.get_bind()
    originals = {t.key: t.label for t in DEFAULT_SPECS if t.number is not None}
    rows = conn.execute(sa.text("SELECT key, label FROM tasks")).fetchall()
    for key, label in rows:
        m = NUMBER_ONLY.match(label or "")
        if key in originals and m and (m.group(1) or m.group(3)):
            conn.execute(sa.text("UPDATE tasks SET label = :label, number = :n, start_day = :d WHERE key = :key"),
                         {"label": originals[key], "n": int(m.group(2)), "d": date.today(), "key": key})


def downgrade() -> None:
    pass
