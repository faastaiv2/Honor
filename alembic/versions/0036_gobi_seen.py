"""Gobi: the person hit sees the splat once

Revision ID: 0036
Revises: 0035
"""
import sqlalchemy as sa
from alembic import op

revision = "0036"
down_revision = "0035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("gobi_launches") as b:
        b.add_column(sa.Column("seen", sa.Boolean(), nullable=False, server_default=sa.true()))  # old hits: already past


def downgrade() -> None:
    with op.batch_alter_table("gobi_launches") as b:
        b.drop_column("seen")
