"""the Oath of Honor and the welcome tour

Revision ID: 0012
Revises: 0011
"""
import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("oath_at", sa.DateTime(timezone=True), nullable=True))
        b.add_column(sa.Column("toured", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.drop_column("toured")
        b.drop_column("oath_at")
