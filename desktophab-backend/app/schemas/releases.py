from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ReleaseArtifactOut(BaseModel):
    platform: str
    url: str
    checksum_sha256: str | None = None
    file_size_bytes: int | None = None


class LatestReleaseResponse(BaseModel):
    app_slug: str
    app_name: str | None = None
    platform: str
    channel: str
    version: str
    notes: str | None = None
    is_force_update: bool
    min_supported_version: str | None = None
    artifact: ReleaseArtifactOut


class AdminReleaseCreateResponse(BaseModel):
    release_id: str
    app_id: str
    app_slug: str
    app_name: str | None = None
    version: str
    channel: str
    is_published: bool
    is_force_update: bool
    min_supported_version: str | None = None
    artifacts: list[ReleaseArtifactOut] = []
    meta: dict[str, Any] = {}


class AdminReleaseOut(BaseModel):
    release_id: str
    app_id: str
    app_slug: str
    app_name: str | None = None
    version: str
    channel: str
    notes: str | None = None
    is_published: bool
    is_force_update: bool
    min_supported_version: str | None = None
    artifacts: list[ReleaseArtifactOut] = []

