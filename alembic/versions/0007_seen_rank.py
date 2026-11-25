"""remember which rank-up show each member has already seen

Revision ID: 0007
Revises: 0006
"""
import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("seen_rank", sa.String(16), nullable=False, server_default=""))
        b.add_column(sa.Column("seen_level_gems", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.drop_column("seen_level_gems")
        b.drop_column("seen_rank")
