"""Community: system posts (new picture, 1st place) and likes

Revision ID: 0031
Revises: 0030
"""
import sqlalchemy as sa
from alembic import op

revision = "0031"
down_revision = "0030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("announcements") as b:
        b.add_column(sa.Column("kind", sa.String(16), nullable=False, server_default="post"))
        b.add_column(sa.Column("member_id", sa.String(32), sa.ForeignKey("members.id", ondelete="CASCADE",
                                                                         name="fk_announcements_member"), nullable=True))
        b.add_column(sa.Column("data", sa.JSON(), nullable=False, server_default="{}"))
        b.create_index("ix_announcements_member_id", ["member_id"])
    op.create_table(
        "post_likes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("post_id", sa.String(32), sa.ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("who", sa.String(48), nullable=False),
        sa.Column("name", sa.String(80), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("post_id", "who", name="uq_post_like"),
    )
    op.create_index("ix_post_likes_post_id", "post_likes", ["post_id"])


def downgrade() -> None:
    op.drop_index("ix_post_likes_post_id", "post_likes")
    op.drop_table("post_likes")
    with op.batch_alter_table("announcements") as b:
        b.drop_index("ix_announcements_member_id")
        b.drop_constraint("fk_announcements_member", type_="foreignkey")
        b.drop_column("data")
        b.drop_column("member_id")
        b.drop_column("kind")
