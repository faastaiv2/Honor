"""videos opened per day (a task's video must be watched before ticking it); announcements

Revision ID: 0027
Revises: 0026
"""
import sqlalchemy as sa
from alembic import op

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("day_logs") as b:
        b.add_column(sa.Column("watched", sa.JSON(), nullable=False, server_default="[]"))
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("news_seen_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "announcements",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("emoji", sa.String(8), nullable=False, server_default="📣"),
        sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("author", sa.String(80), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("announcements")
    with op.batch_alter_table("members") as b:
        b.drop_column("news_seen_at")
    with op.batch_alter_table("day_logs") as b:
        b.drop_column("watched")
