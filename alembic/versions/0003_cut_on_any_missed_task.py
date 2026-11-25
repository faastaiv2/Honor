"""Honor is cut when any task is missed (was: 5 or more)

Revision ID: 0003
Revises: 0002
"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE app_settings SET cut_misses = 1 WHERE cut_misses = 5")


def downgrade() -> None:
    op.execute("UPDATE app_settings SET cut_misses = 5 WHERE cut_misses = 1")
