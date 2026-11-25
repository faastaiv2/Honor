"""goblins steal gems when a member falls to the Pillar of Shame

Revision ID: 0022
Revises: 0021
"""
import sqlalchemy as sa
from alembic import op

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("gems_stolen", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("raid_owed", sa.Integer(), nullable=False, server_default="-1"))


def downgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.drop_column("raid_owed")
        b.drop_column("gems_stolen")
