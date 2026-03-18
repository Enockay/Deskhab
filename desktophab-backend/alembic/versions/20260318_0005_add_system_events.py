"""add system events

Revision ID: 20260318_0005
Revises: 20260318_0004
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260318_0005"
down_revision = "20260318_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    systemeventtype = sa.Enum(
        "payment", "email", "device", "realtime", "auth", "system",
        name="systemeventtype",
    )
    # Create enum once (create_all in dev may have already created it)
    systemeventtype.create(bind, checkfirst=True)

    # Prevent SQLAlchemy from attempting to create the enum again during CREATE TABLE.
    systemeventtype_col = sa.Enum(
        "payment", "email", "device", "realtime", "auth", "system",
        name="systemeventtype",
        create_type=False,
    )

    if not inspector.has_table("system_events"):
        op.create_table(
            "system_events",
            sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("type", systemeventtype_col, nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("level", sa.String(length=16), nullable=False, server_default="info"),
            sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("app_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("apps.id", ondelete="SET NULL"), nullable=True),
            sa.Column("message", sa.String(length=512), nullable=True),
            sa.Column("meta", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        )

    existing_indexes = {ix.get("name") for ix in inspector.get_indexes("system_events")}
    for name, cols in [
        ("ix_system_events_type", ["type"]),
        ("ix_system_events_name", ["name"]),
        ("ix_system_events_created_at", ["created_at"]),
        ("ix_system_events_user_id", ["user_id"]),
        ("ix_system_events_admin_id", ["admin_id"]),
        ("ix_system_events_app_id", ["app_id"]),
        ("ix_system_events_type_created", ["type", "created_at"]),
        ("ix_system_events_name_created", ["name", "created_at"]),
    ]:
        if name not in existing_indexes:
            op.create_index(name, "system_events", cols)


def downgrade() -> None:
    op.drop_index("ix_system_events_name_created", table_name="system_events")
    op.drop_index("ix_system_events_type_created", table_name="system_events")
    op.drop_index("ix_system_events_app_id", table_name="system_events")
    op.drop_index("ix_system_events_admin_id", table_name="system_events")
    op.drop_index("ix_system_events_user_id", table_name="system_events")
    op.drop_index("ix_system_events_created_at", table_name="system_events")
    op.drop_index("ix_system_events_name", table_name="system_events")
    op.drop_index("ix_system_events_type", table_name="system_events")
    op.drop_table("system_events")

    systemeventtype = sa.Enum(
        "payment", "email", "device", "realtime", "auth", "system",
        name="systemeventtype",
    )
    systemeventtype.drop(op.get_bind(), checkfirst=True)

