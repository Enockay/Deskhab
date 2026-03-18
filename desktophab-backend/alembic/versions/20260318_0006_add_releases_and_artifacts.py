"""add releases and artifacts

Revision ID: 20260318_0006
Revises: 20260318_0005
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260318_0006"
down_revision = "20260318_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    releasechannel = sa.Enum("stable", "beta", name="releasechannel")
    releasechannel.create(bind, checkfirst=True)
    releasechannel_col = sa.Enum("stable", "beta", name="releasechannel", create_type=False)

    platform = sa.Enum("macos", "windows", "linux", name="platform")
    platform.create(bind, checkfirst=True)
    platform_col = sa.Enum("macos", "windows", "linux", name="platform", create_type=False)

    # Releases table
    if not inspector.has_table("releases"):
        op.create_table(
            "releases",
            sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "app_id",
                sa.dialects.postgresql.UUID(as_uuid=True),
                sa.ForeignKey("apps.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("version", sa.String(length=32), nullable=False),
            sa.Column("channel", releasechannel_col, nullable=False, server_default="stable"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("is_force_update", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("min_supported_version", sa.String(length=32), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.UniqueConstraint("app_id", "version", "channel", name="uq_release_app_version_channel"),
        )

    existing_indexes = {ix.get("name") for ix in inspector.get_indexes("releases")}
    if "ix_releases_app_id" not in existing_indexes:
        op.create_index("ix_releases_app_id", "releases", ["app_id"])

    # Artifacts table
    if not inspector.has_table("artifacts"):
        op.create_table(
            "artifacts",
            sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "release_id",
                sa.dialects.postgresql.UUID(as_uuid=True),
                sa.ForeignKey("releases.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("platform", platform_col, nullable=False),
            sa.Column("url", sa.String(length=512), nullable=False),
            sa.Column("checksum_sha256", sa.String(length=128), nullable=True),
            sa.Column("file_size_bytes", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        )

    existing_indexes = {ix.get("name") for ix in inspector.get_indexes("artifacts")}
    if "ix_artifacts_release_id" not in existing_indexes:
        op.create_index("ix_artifacts_release_id", "artifacts", ["release_id"])


def downgrade() -> None:
    # Best-effort cleanup
    try:
        op.drop_index("ix_artifacts_release_id", table_name="artifacts")
    except Exception:
        pass
    try:
        op.drop_table("artifacts")
    except Exception:
        pass

    try:
        op.drop_index("ix_releases_app_id", table_name="releases")
    except Exception:
        pass
    try:
        op.drop_table("releases")
    except Exception:
        pass

    op.execute("DROP TYPE IF EXISTS releasechannel")
    op.execute("DROP TYPE IF EXISTS platform")

