from __future__ import annotations

import uuid as uuidlib

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi import Query
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_403_FORBIDDEN

from app.core.admin_dependencies import get_current_admin_user
from app.core.dependencies import get_db
from app.db.session import AsyncSessionLocal
from app.db.models import (
    AdminRole,
    App,
    AuditLog,
    Artifact,
    Platform,
    Release,
    ReleaseChannel,
)
from app.schemas.releases import AdminReleaseCreateResponse, AdminReleaseOut, ReleaseArtifactOut
from app.services.s3 import make_release_s3_key, upload_file_to_s3
from app.services.s3 import generate_presigned_get_url

router = APIRouter()


def _ip(request: Request) -> str:
    return request.client.host if request.client else ""


def _require_manager_or_admin(current_admin) -> None:
    # Match behavior of other admin write endpoints: support cannot manage releases.
    if current_admin.role == AdminRole.support:
        raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Insufficient role")


@router.post("/admin/releases", response_model=AdminReleaseCreateResponse)
async def create_release(
    request: Request,
    app_id: str = Form(...),
    version: str = Form(...),
    channel: ReleaseChannel = Form(ReleaseChannel.stable),
    notes: str | None = Form(None),
    is_published: bool = Form(False),
    make_latest: bool = Form(False),
    is_force_update: bool = Form(False),
    min_supported_version: str | None = Form(None),
    macos_file: UploadFile | None = File(None),
    windows_file: UploadFile | None = File(None),
    linux_file: UploadFile | None = File(None),
    current_admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):  # pragma: no cover - exercised through frontend
    _require_manager_or_admin(current_admin)

    if not (macos_file or windows_file or linux_file):
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="At least one file is required")

    version_norm = (version or "").strip()
    if not version_norm:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="version_required")

    try:
        app_uuid = uuidlib.UUID(app_id)
    except Exception:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="invalid_app_id")

    res_app = await db.execute(select(App).where(App.id == app_uuid))
    app = res_app.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    # If admin marked "latest for channel", treat it as "published" and unpublish other releases.
    publish_release = bool(is_published or make_latest)
    if make_latest:
        await db.execute(
            update(Release)
            .where(Release.app_id == app_uuid, Release.channel == channel)
            .values(is_published=False)
        )

    res_rel = await db.execute(
        select(Release).where(
            Release.app_id == app_uuid,
            Release.version == version_norm,
            Release.channel == channel,
        )
    )
    release = res_rel.scalar_one_or_none()
    release_id: str
    is_published: bool = publish_release
    if release:
        release.notes = notes
        release.is_force_update = bool(is_force_update)
        release.min_supported_version = min_supported_version
        release.is_published = publish_release
    else:
        release = Release(
            app_id=app_uuid,
            version=version_norm,
            channel=channel,
            notes=notes,
            is_published=publish_release,
            is_force_update=bool(is_force_update),
            min_supported_version=min_supported_version,
        )
        db.add(release)
        await db.flush()

    # Persist the release record before uploading files.
    # S3 uploads can be slow; holding an open DB connection during upload can cause
    # asyncpg connection timeouts / disconnects mid-request.
    await db.commit()
    release_id = str(release.id)
    release_app_id = release.app_id

    # Close this session early; we will open fresh sessions for artifact/audit writes.
    await db.close()

    rel_uuid = uuidlib.UUID(release_id)
    uploaded_platforms: list[str] = []
    artifacts_out: list[ReleaseArtifactOut] = []

    file_map: dict[Platform, UploadFile] = {}
    if macos_file:
        file_map[Platform.macos] = macos_file
    if windows_file:
        file_map[Platform.windows] = windows_file
    if linux_file:
        file_map[Platform.linux] = linux_file

    for platform_enum, upload in file_map.items():
        # Upload file to S3 and store resulting URL in DB.
        key = make_release_s3_key(
            app_slug=app.slug,
            channel=channel.value,
            version=version_norm,
            platform=platform_enum.value,
            filename=upload.filename or platform_enum.value,
        )
        url, size = await upload_file_to_s3(upload, key=key)
        uploaded_platforms.append(platform_enum.value)

        async with AsyncSessionLocal() as platform_db:
            res_art = await platform_db.execute(
                select(Artifact).where(Artifact.release_id == rel_uuid, Artifact.platform == platform_enum)
            )
            existing = res_art.scalars().all()
            if existing:
                existing[0].url = url
                existing[0].file_size_bytes = size
                # checksum_sha256 omitted until we compute it (optional)
                for extra in existing[1:]:
                    await platform_db.delete(extra)
            else:
                platform_db.add(
                    Artifact(
                        release_id=rel_uuid,
                        platform=platform_enum,
                        url=url,
                        checksum_sha256=None,
                        file_size_bytes=size,
                    )
                )
            await platform_db.commit()

    async with AsyncSessionLocal() as audit_db:
        audit_db.add(
            AuditLog(
                admin_id=current_admin.id,
                action="release.upsert",
                target_type="release",
                target_id=release_id,
                detail={
                    "app_id": str(release_app_id),
                    "version": version_norm,
                    "channel": channel.value,
                    "uploaded_platforms": uploaded_platforms,
                    "is_published": publish_release,
                    "is_force_update": bool(is_force_update),
                    "min_supported_version": min_supported_version,
                    "notes": notes,
                },
                ip_address=_ip(request),
            )
        )
        await audit_db.commit()

    # Build response from stored rows (for the platforms we uploaded).
    async with AsyncSessionLocal() as read_db:
        for platform_enum in file_map.keys():
            res_art = await read_db.execute(
                select(Artifact).where(Artifact.release_id == rel_uuid, Artifact.platform == platform_enum)
            )
            art = res_art.scalar_one_or_none()
            if art:
                artifacts_out.append(
                    ReleaseArtifactOut(
                        platform=platform_enum.value,
                        url=art.url,
                        checksum_sha256=art.checksum_sha256,
                        file_size_bytes=art.file_size_bytes,
                    )
                )

    return AdminReleaseCreateResponse(
        release_id=release_id,
        app_id=str(release_app_id),
        app_slug=app.slug,
        app_name=app.name,
        version=release.version,
        channel=release.channel.value,
        is_published=is_published,
        is_force_update=bool(is_force_update),
        min_supported_version=min_supported_version,
        artifacts=artifacts_out,
    )


@router.get("/admin/releases", response_model=list[AdminReleaseOut])
async def list_releases(
    app_id: str | None = Query(None),
    channel: ReleaseChannel | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Read-only for releases list: allow manager/admin, but keep support read-only too.
    # (Support exists but may be restricted depending on your policy.)
    if current_admin.role == AdminRole.support:
        # support can't manage releases, but we allow listing for debugging/admin convenience.
        pass

    q = select(Release).options(selectinload(Release.app), selectinload(Release.artifacts))
    if app_id:
        try:
            app_uuid = uuidlib.UUID(app_id)
        except Exception:
            raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="invalid_app_id")
        q = q.where(Release.app_id == app_uuid)
    if channel:
        q = q.where(Release.channel == channel)

    q = q.order_by(Release.created_at.desc()).limit(limit).offset(offset)

    res = await db.execute(q)
    releases = res.scalars().all()

    out: list[AdminReleaseOut] = []
    for rel in releases:
        artifacts = [
            ReleaseArtifactOut(
                platform=a.platform.value if hasattr(a.platform, "value") else str(a.platform),
                url=generate_presigned_get_url(a.url, expires_in=3600),
                checksum_sha256=a.checksum_sha256,
                file_size_bytes=a.file_size_bytes,
            )
            for a in (rel.artifacts or [])
        ]
        out.append(
            AdminReleaseOut(
                release_id=str(rel.id),
                app_id=str(rel.app_id),
                app_slug=rel.app.slug,
                app_name=rel.app.name,
                version=rel.version,
                channel=rel.channel.value,
                notes=rel.notes,
                is_published=bool(rel.is_published),
                is_force_update=bool(rel.is_force_update),
                min_supported_version=rel.min_supported_version,
                artifacts=artifacts,
            )
        )

    return out

