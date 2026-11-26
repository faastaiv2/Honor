"""Saying yes to Shaytan cuts Honor straight away

Revision ID: 0035
Revises: 0034
"""
import sqlalchemy as sa
from alembic import op

revision = "0035"
down_revision = "0034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("temptations") as b:
        b.add_column(sa.Column("auto_cut", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    with op.batch_alter_table("temptations") as b:
        b.drop_column("auto_cut")
