"""Tests: a carrier pigeon brings a medieval thank-you note and a gift of gems

Revision ID: 0040
Revises: 0039
"""
import sqlalchemy as sa
from alembic import op

revision = "0040"
down_revision = "0039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pigeon_notes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender", sa.String(80), nullable=False, server_default=""),
        sa.Column("gems", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("message", sa.Text(), nullable=False, server_default=""),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_pigeon_notes_member_id", "pigeon_notes", ["member_id"])


def downgrade() -> None:
    op.drop_index("ix_pigeon_notes_member_id", "pigeon_notes")
    op.drop_table("pigeon_notes")
