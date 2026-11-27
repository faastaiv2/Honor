"""Rude kid: a fourth choice, tell a grown-up (the name the admin types; never stored in the code)

Revision ID: 0044
Revises: 0043
"""
import sqlalchemy as sa
from alembic import op

revision = "0044"
down_revision = "0043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("bully_tests") as b:
        b.add_column(sa.Column("elder", sa.String(80), nullable=False, server_default=""))


def downgrade() -> None:
    with op.batch_alter_table("bully_tests") as b:
        b.drop_column("elder")
