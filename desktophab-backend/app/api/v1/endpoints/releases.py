from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.db.models import App, Artifact, Release, ReleaseChannel, Platform
from app.schemas.releases import LatestReleaseResponse, ReleaseArtifactOut
from app.services.s3 import generate_presigned_get_url

router = APIRouter()


@router.get(
    "/apps/{app_slug}/releases/latest",
    response_model=LatestReleaseResponse,
)
async def get_latest_release(
    app_slug: str,
    platform: Platform = Query(..., description="macos|windows|linux"),
    channel: ReleaseChannel = Query(ReleaseChannel.stable, description="stable|beta"),
    db: AsyncSession = Depends(get_db),
) -> LatestReleaseResponse:
    app_slug_norm = (app_slug or "").strip().lower()
    if not app_slug_norm:
        raise HTTPException(status_code=400, detail="app_slug_required")

    # Resolve app id first (keeps the join filter simple and clear).
    res_app = await db.execute(select(App).where(App.slug == app_slug_norm))
    app = res_app.scalar_one_or_none()
    if not app or not app.is_active:
        raise HTTPException(status_code=404, detail="App not found")

    q = (
        select(Release, Artifact)
        .join(Artifact, Artifact.release_id == Release.id)
        .where(
            Release.app_id == app.id,
            Release.channel == channel,
            Release.is_published.is_(True),
            Artifact.platform == platform,
        )
        .order_by(Release.created_at.desc())
        .limit(1)
    )

    res = await db.execute(q)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="No published release found")

    release, artifact = row

    return LatestReleaseResponse(
        app_slug=app.slug,
        app_name=app.name,
        platform=platform.value,
        channel=channel.value,
        version=release.version,
        notes=release.notes,
        is_force_update=release.is_force_update,
        min_supported_version=release.min_supported_version,
        artifact=ReleaseArtifactOut(
            platform=platform.value,
            url=generate_presigned_get_url(artifact.url, expires_in=3600),
            checksum_sha256=artifact.checksum_sha256,
            file_size_bytes=artifact.file_size_bytes,
        ),
    )

