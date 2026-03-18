"""add device bindings

Revision ID: 20260318_0003
Revises: 20260318_0002
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20260318_0003"
down_revision = "20260318_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    # In dev we auto-create tables via Base.metadata.create_all, which may create this table
    # before Alembic runs. Make the migration idempotent.
    if not inspector.has_table("device_bindings"):
        op.create_table(
            "device_bindings",
            sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("device_id", sa.String(length=128), nullable=False),
            sa.Column("device_name", sa.String(length=255), nullable=True),
            sa.Column("platform", sa.String(length=64), nullable=True),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("user_id", name="uq_device_bindings_user_id"),
        )

    existing_indexes = {ix.get("name") for ix in inspector.get_indexes("device_bindings")}
    if "ix_device_bindings_user_id" not in existing_indexes:
        op.create_index("ix_device_bindings_user_id", "device_bindings", ["user_id"])
    if "ix_device_bindings_device_id" not in existing_indexes:
        op.create_index("ix_device_bindings_device_id", "device_bindings", ["device_id"])


def downgrade() -> None:
    op.drop_index("ix_device_bindings_device_id", table_name="device_bindings")
    op.drop_index("ix_device_bindings_user_id", table_name="device_bindings")
    op.drop_table("device_bindings")

