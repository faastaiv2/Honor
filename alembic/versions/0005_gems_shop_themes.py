"""gems shop: purchases, member theme

Revision ID: 0005
Revises: 0004
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("theme", sa.String(16), nullable=False, server_default=""))
    op.create_table(
        "purchases",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item", sa.String(40), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("member_id", "item", name="uq_member_item"),
    )
    op.create_index("ix_purchases_member_id", "purchases", ["member_id"])


def downgrade() -> None:
    op.drop_index("ix_purchases_member_id", "purchases")
    op.drop_table("purchases")
    with op.batch_alter_table("members") as b:
        b.drop_column("theme")
