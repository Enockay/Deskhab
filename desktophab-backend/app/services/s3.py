from __future__ import annotations

import uuid

from fastapi import HTTPException, UploadFile
from urllib.parse import urlparse

from loguru import logger

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
    # If boto3 isn't installed, fail with a clear message (frontend expects `detail`).
    try:
        import boto3  # type: ignore
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "S3 upload misconfigured: `boto3` is not installed in the backend environment. "
                "Install dependencies from `desktophab-backend/requirements.txt` and restart the API."
            ),
        ) from exc

    if not settings.AWS_S3_BUCKET:
        raise ValueError("AWS_S3_BUCKET is not configured")

    client_kwargs = {
        "region_name": settings.AWS_REGION,
    }
    # Allow IAM roles / env-based credentials (omit explicit creds when not configured).
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    client = boto3.client("s3", **client_kwargs)

    size: int | None = None
    try:
        upload_file.file.seek(0, 2)
        size = int(upload_file.file.tell())
        upload_file.file.seek(0)
    except Exception:
        size = None

    content_type = upload_file.content_type or "application/octet-stream"
    try:
        client.upload_fileobj(
            upload_file.file,
            settings.AWS_S3_BUCKET,
            key,
            ExtraArgs={"ContentType": content_type},
        )
    except Exception as exc:  # boto3/botocore raises typed ClientError subclasses
        # Surface useful AWS error details to the frontend.
        code = getattr(exc, "response", {}).get("Error", {}).get("Code") if hasattr(exc, "response") else None
        message = getattr(exc, "response", {}).get("Error", {}).get("Message") if hasattr(exc, "response") else None
        detail_bits = []
        if code:
            detail_bits.append(code)
        if message:
            detail_bits.append(message)
        detail = "S3 upload failed"
        if detail_bits:
            detail += f": {': '.join(detail_bits)}"
        raise HTTPException(status_code=500, detail=detail) from exc

    return _public_url(key), size


def make_release_s3_key(*, app_slug: str, channel: str, version: str, platform: str, filename: str) -> str:
    # Keep S3 keys deterministic enough for debugging, but unique enough for collisions.
    safe_name = (filename or "artifact").replace(" ", "_")
    return f"releases/{app_slug}/{channel}/{version}/{platform}/{uuid.uuid4().hex}_{safe_name}"


def extract_s3_key(url_or_key: str) -> str:
    """
    Extract the S3 object key from:
    - a raw key like `releases/.../file.zip`
    - a full S3 URL like `https://bucket.s3.region.amazonaws.com/<key>`
    - a custom public base URL like `https://cdn.example.com/<key>`
    """
    if not url_or_key:
        raise ValueError("url_or_key is required")

    # If it's already a key (no scheme), return as-is.
    if "://" not in url_or_key:
        return url_or_key.lstrip("/")

    parsed = urlparse(url_or_key)
    path = (parsed.path or "").lstrip("/")
    if not path:
        raise ValueError("Could not extract key from url")

    # Path-style URLs: https://s3.region.amazonaws.com/<bucket>/<key>
    if settings.AWS_S3_BUCKET and path.startswith(f"{settings.AWS_S3_BUCKET}/"):
        return path.split("/", 1)[1]

    # Virtual-host style & custom bases: https://<base>/<key>
    return path


def generate_presigned_get_url(url_or_key: str, *, expires_in: int = 3600) -> str:
    """
    Generate a server-side S3 presigned URL for downloading a private object.
    """
    if expires_in <= 0:
        raise ValueError("expires_in must be > 0")

    try:
        key = extract_s3_key(url_or_key)
    except Exception as exc:
        raise ValueError(f"Could not extract S3 key: {exc}") from exc

    if not settings.AWS_S3_BUCKET:
        raise ValueError("AWS_S3_BUCKET is not configured")

    try:
        import boto3  # type: ignore
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "S3 presign misconfigured: `boto3` is not installed in the backend environment. "
                "Install dependencies from `desktophab-backend/requirements.txt` and restart the API."
            ),
        ) from exc

    # Use signature V4 (required for presigned URLs).
    logger.info(
        "Generating S3 presigned URL",
        bucket=settings.AWS_S3_BUCKET,
        region=settings.AWS_REGION,
    )

    client_kwargs = {"region_name": settings.AWS_REGION}
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    client = boto3.client("s3", **client_kwargs)

    # Our object keys include a UUID prefix for uniqueness:
    #   <uuid4hex>_<original_filename>
    # Make the browser download file name short by stripping the UUID prefix.
    last = (key.split("/")[-1] or "").strip()
    download_name = last
    if len(last) > 33 and "_" in last:
        prefix, rest = last.split("_", 1)
        if len(prefix) == 32 and all(c in "0123456789abcdefABCDEF" for c in prefix):
            download_name = rest

    return client.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": settings.AWS_S3_BUCKET,
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{download_name}"',
        },
        ExpiresIn=expires_in,
    )

