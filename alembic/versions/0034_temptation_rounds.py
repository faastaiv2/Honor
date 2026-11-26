"""Shaytan comes back with bigger offers: refusals and the final offer

Revision ID: 0034
Revises: 0033
"""
import sqlalchemy as sa
from alembic import op

revision = "0034"
down_revision = "0033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("temptations") as b:
        b.add_column(sa.Column("refusals", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("final_offer", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("temptations") as b:
        b.drop_column("final_offer")
        b.drop_column("refusals")
