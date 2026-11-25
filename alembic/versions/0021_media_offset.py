"""when in the animation a sound starts (an offset from its usual moment)

Revision ID: 0021
Revises: 0020
"""
import sqlalchemy as sa
from alembic import op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("media") as b:
        b.add_column(sa.Column("offset_ms", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("media") as b:
        b.drop_column("offset_ms")
