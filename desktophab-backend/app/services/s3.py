from __future__ import annotations

import uuid

from fastapi import UploadFile

from app.core.config import settings


def _public_url(key: str) -> str:
    if settings.AWS_S3_PUBLIC_BASE_URL:
        return f"{settings.AWS_S3_PUBLIC_BASE_URL.rstrip('/')}/{key.lstrip('/')}"
    # Default S3 URL (works for publicly-readable buckets / standard configuration)
    if not settings.AWS_S3_BUCKET:
        raise ValueError("AWS_S3_BUCKET is not configured")
    region = settings.AWS_REGION or "us-east-1"
    return f"https://{settings.AWS_S3_BUCKET}.s3.{region}.amazonaws.com/{key}"


async def upload_file_to_s3(
    upload_file: UploadFile,
    *,
    key: str,
) -> tuple[str, int | None]:
    """
    Upload an `UploadFile` to S3 and return (public_url, file_size_bytes).

    Note: This assumes your bucket/object ACL/CORS policy makes the generated URL reachable.
    """

    # Import boto3 lazily to avoid import errors during non-S3 operations/tests.
    import boto3  # type: ignore

    if not settings.AWS_S3_BUCKET:
        raise ValueError("AWS_S3_BUCKET is not configured")

    client = boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )

    size: int | None = None
    try:
        upload_file.file.seek(0, 2)
        size = int(upload_file.file.tell())
        upload_file.file.seek(0)
    except Exception:
        size = None

    content_type = upload_file.content_type or "application/octet-stream"
    client.upload_fileobj(
        upload_file.file,
        settings.AWS_S3_BUCKET,
        key,
        ExtraArgs={"ContentType": content_type},
    )

    return _public_url(key), size


def make_release_s3_key(*, app_slug: str, channel: str, version: str, platform: str, filename: str) -> str:
    # Keep S3 keys deterministic enough for debugging, but unique enough for collisions.
    safe_name = (filename or "artifact").replace(" ", "_")
    return f"releases/{app_slug}/{channel}/{version}/{platform}/{uuid.uuid4().hex}_{safe_name}"

