"""Community: reactions (👎 😤 😠) on "left the kitten" posts; the kitten test remembers if it was posted

Revision ID: 0043
Revises: 0042
"""
import sqlalchemy as sa
from alembic import op

revision = "0043"
down_revision = "0042"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("post_likes") as b:
        b.add_column(sa.Column("reaction", sa.String(8), nullable=False, server_default=""))
    with op.batch_alter_table("kitten_tests") as b:
        b.add_column(sa.Column("posted", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("kitten_tests") as b:
        b.drop_column("posted")
    with op.batch_alter_table("post_likes") as b:
        b.drop_column("reaction")
