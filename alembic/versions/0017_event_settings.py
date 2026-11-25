"""event times, prizes, entry fee and banner

Revision ID: 0017
Revises: 0016
"""
import sqlalchemy as sa
from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("events") as b:
        b.add_column(sa.Column("opens", sa.String(5), nullable=False, server_default="00:00"))
        b.add_column(sa.Column("closes", sa.String(5), nullable=False, server_default="23:59"))
        b.add_column(sa.Column("prize1", sa.Integer(), nullable=False, server_default="100"))
        b.add_column(sa.Column("prize2", sa.Integer(), nullable=False, server_default="50"))
        b.add_column(sa.Column("prize3", sa.Integer(), nullable=False, server_default="25"))
        b.add_column(sa.Column("fee", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("banner", sa.String(16), nullable=False, server_default="sunset"))
        b.add_column(sa.Column("banner_image", sa.LargeBinary(), nullable=True))
        b.add_column(sa.Column("banner_mime", sa.String(20), nullable=False, server_default=""))
    with op.batch_alter_table("event_entries") as b:
        b.add_column(sa.Column("fee_paid", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("event_entries") as b:
        b.drop_column("fee_paid")
    with op.batch_alter_table("events") as b:
        for c in ("banner_mime", "banner_image", "banner", "fee", "prize3", "prize2", "prize1", "closes", "opens"):
            b.drop_column(c)
