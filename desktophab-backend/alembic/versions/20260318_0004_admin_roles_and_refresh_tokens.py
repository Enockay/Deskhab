"""admin roles + admin refresh tokens

Revision ID: 20260318_0004
Revises: 20260318_0003
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260318_0004"
down_revision = "20260318_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    # Admin roles enum
    adminrole = sa.Enum("support", "manager", "admin", name="adminrole")
    adminrole.create(bind, checkfirst=True)

    # Add role column to admin_users
    existing_cols = {c["name"] for c in inspector.get_columns("admin_users")}
    if "role" not in existing_cols:
        op.add_column(
            "admin_users",
            sa.Column("role", adminrole, nullable=False, server_default="admin"),
        )
        op.alter_column("admin_users", "role", server_default=None)

    # Admin refresh tokens table
    if not inspector.has_table("admin_refresh_tokens"):
        op.create_table(
            "admin_refresh_tokens",
            sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.UniqueConstraint("token_hash", name="uq_admin_refresh_tokens_token_hash"),
        )

    existing_indexes = {ix.get("name") for ix in inspector.get_indexes("admin_refresh_tokens")}
    if "ix_admin_refresh_tokens_admin_id" not in existing_indexes:
        op.create_index("ix_admin_refresh_tokens_admin_id", "admin_refresh_tokens", ["admin_id"])
    if "ix_admin_refresh_tokens_token_hash" not in existing_indexes:
        op.create_index("ix_admin_refresh_tokens_token_hash", "admin_refresh_tokens", ["token_hash"])
    if "ix_admin_refresh_tokens_hash_revoked" not in existing_indexes:
        op.create_index("ix_admin_refresh_tokens_hash_revoked", "admin_refresh_tokens", ["token_hash", "revoked"])


def downgrade() -> None:
    op.drop_index("ix_admin_refresh_tokens_hash_revoked", table_name="admin_refresh_tokens")
    op.drop_index("ix_admin_refresh_tokens_token_hash", table_name="admin_refresh_tokens")
    op.drop_index("ix_admin_refresh_tokens_admin_id", table_name="admin_refresh_tokens")
    op.drop_table("admin_refresh_tokens")

    op.drop_column("admin_users", "role")

    adminrole = sa.Enum("support", "manager", "admin", name="adminrole")
    adminrole.drop(op.get_bind(), checkfirst=True)

