"""gems a parent gives or takes by hand; whether a Godfather has seen their show

Revision ID: 0029
Revises: 0028
"""
import sqlalchemy as sa
from alembic import op

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gem_grants",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(200), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.String(120), nullable=False, server_default=""),
    )
    op.create_index("ix_gem_grants_member_id", "gem_grants", ["member_id"])
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("godfather_seen", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.drop_column("godfather_seen")
    op.drop_index("ix_gem_grants_member_id", "gem_grants")
    op.drop_table("gem_grants")
