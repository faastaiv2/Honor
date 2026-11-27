"""Events: submissions can open on an earlier day than they close (post the event any time in the week)

Revision ID: 0047
Revises: 0046
"""
import sqlalchemy as sa
from alembic import op

revision = "0047"
down_revision = "0046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("events") as b:
        b.add_column(sa.Column("open_day", sa.Date(), nullable=True))  # empty: opens on the same day it closes
    op.execute("UPDATE events SET open_day = day")


def downgrade() -> None:
    with op.batch_alter_table("events") as b:
        b.drop_column("open_day")
