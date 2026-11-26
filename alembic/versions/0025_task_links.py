"""tasks can have a video link for each day of the week (Dalilul Khairat)

Revision ID: 0025
Revises: 0024
"""
import json

import sqlalchemy as sa
from alembic import op

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None

DALAIL = [
    "https://www.youtube.com/watch?v=O9lFtZyP-Nw", "https://www.youtube.com/watch?v=qxVks92t9aU",
    "https://www.youtube.com/watch?v=8-ODssYYG54", "https://www.youtube.com/watch?v=2zj6Hc2QEKo",
    "https://www.youtube.com/watch?v=2Yws50vvchQ", "https://www.youtube.com/watch?v=Bya8BPdFbNM",
    "https://www.youtube.com/watch?v=BSlyyqH-4dA&t=492s",
]


def upgrade() -> None:
    with op.batch_alter_table("tasks") as b:
        b.add_column(sa.Column("links", sa.JSON(), nullable=False, server_default="[]"))
    op.get_bind().execute(sa.text("UPDATE tasks SET links = :v WHERE key = 'dalail'"), {"v": json.dumps(DALAIL)})


def downgrade() -> None:
    with op.batch_alter_table("tasks") as b:
        b.drop_column("links")
