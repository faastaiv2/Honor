"""Help messages: the page the member is taken to when they see what was added

Revision ID: 0048
Revises: 0047
"""
import sqlalchemy as sa
from alembic import op

revision = "0048"
down_revision = "0047"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("feedback") as b:
        b.add_column(sa.Column("link", sa.String(40), nullable=False, server_default=""))


def downgrade() -> None:
    with op.batch_alter_table("feedback") as b:
        b.drop_column("link")
