"""the free animal pictures move to the Common shop: members wearing one keep it (owned, free)

Revision ID: 0026
Revises: 0025
"""
import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None

ANIMALS = ["lion", "tiger", "eagle", "wolf", "fox", "owl", "bear", "cat", "turtle", "dolphin"]


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, avatar FROM members WHERE avatar IN :a").bindparams(sa.bindparam("a", expanding=True)),
                        {"a": ANIMALS}).all()
    for member_id, avatar in rows:
        item = f"avatar:{avatar}"
        if conn.execute(sa.text("SELECT 1 FROM purchases WHERE member_id = :m AND item = :i"), {"m": member_id, "i": item}).first():
            continue
        conn.execute(sa.text("INSERT INTO purchases (id, member_id, item, price, created_at) VALUES (:id, :m, :i, 0, :t)"),
                     {"id": uuid.uuid4().hex, "m": member_id, "i": item, "t": datetime.now(timezone.utc)})


def downgrade() -> None:
    pass
