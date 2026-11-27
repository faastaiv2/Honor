"""Help messages: the admin's note when resolving one, and whether the member has seen it

Revision ID: 0046
Revises: 0045
"""
import sqlalchemy as sa
from alembic import op

revision = "0046"
down_revision = "0045"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("feedback") as b:
        b.add_column(sa.Column("reply", sa.Text(), nullable=False, server_default=""))
        b.add_column(sa.Column("done_seen", sa.Boolean(), nullable=False, server_default=sa.true()))  # old ones: nothing to show


def downgrade() -> None:
    with op.batch_alter_table("feedback") as b:
        b.drop_column("done_seen")
        b.drop_column("reply")
