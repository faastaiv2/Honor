"""a sound can play just a section: from start to end

Revision ID: 0020
Revises: 0019
"""
import sqlalchemy as sa
from alembic import op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("media") as b:
        b.add_column(sa.Column("end", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("media") as b:
        b.drop_column("end")
