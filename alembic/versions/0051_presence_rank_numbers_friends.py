"""Online dot, task numbers set per rank, and the Friends quest

Revision ID: 0051
Revises: 0050
"""
import sqlalchemy as sa
from alembic import op

revision = "0051"
down_revision = "0050"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("members") as b:
        b.add_column(sa.Column("active_at", sa.DateTime(timezone=True), nullable=True))
        b.add_column(sa.Column("active_page", sa.String(40), nullable=False, server_default=""))
    with op.batch_alter_table("tasks") as b:
        b.add_column(sa.Column("rank_numbers", sa.JSON(), nullable=True))
    op.create_table(
        "friend_quests",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("dhikr", sa.String(160), nullable=False, server_default=""),
        sa.Column("prizes", sa.JSON(), nullable=False),
        sa.Column("opens_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closes_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "friend_teams",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("quest_id", sa.String(32), sa.ForeignKey("friend_quests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("members", sa.JSON(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=True),
        sa.Column("entered_by", sa.String(32), nullable=False, server_default=""),
        sa.Column("entered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("place", sa.Integer(), nullable=True),
        sa.Column("gems", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("seen_by", sa.JSON(), nullable=False),
    )
    op.create_index("ix_friend_teams_quest_id", "friend_teams", ["quest_id"])


def downgrade() -> None:
    op.drop_index("ix_friend_teams_quest_id", "friend_teams")
    op.drop_table("friend_teams")
    op.drop_table("friend_quests")
    with op.batch_alter_table("tasks") as b:
        b.drop_column("rank_numbers")
    with op.batch_alter_table("members") as b:
        b.drop_column("active_page")
        b.drop_column("active_at")
