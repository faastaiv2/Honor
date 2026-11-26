"""a parent's own look (white or dark)

Revision ID: 0030
Revises: 0029
"""
import sqlalchemy as sa
from alembic import op

revision = "0030"
down_revision = "0029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("admins") as b:
        b.add_column(sa.Column("theme", sa.String(16), nullable=False, server_default="white"))


def downgrade() -> None:
    with op.batch_alter_table("admins") as b:
        b.drop_column("theme")
