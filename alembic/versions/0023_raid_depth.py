"""goblin raids grow with each level fallen (-I, -II, -III)

Revision ID: 0023
Revises: 0022
"""
import sqlalchemy as sa
from alembic import op

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("raid_depth", sa.Integer(), nullable=False, server_default="0"))
    # Anyone already on the Pillar of Shame was raided when they fell: start them at their level.
    op.execute("UPDATE members SET raid_depth = -1 WHERE seen_rank = 'low'")


def downgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.drop_column("raid_depth")
