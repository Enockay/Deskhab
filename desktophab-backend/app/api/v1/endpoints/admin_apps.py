from __future__ import annotations

import json
import uuid as uuidlib

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi import File, Form, UploadFile
from sqlalchemy import String, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_dependencies import get_current_admin_user
from app.core.dependencies import get_db
from app.db.models import AdminRole, AdminUser, App, AuditLog, Release
from app.schemas.admin_apps import AdminAppOut, AdminAppUpdateRequest, AdminAppCreateRequest
from app.services.s3 import upload_file_to_s3, generate_presigned_get_url


router = APIRouter()
VALID_IMAGE_TABS = {"dashboard", "reminders", "todolist", "taskboard", "year"}


def _ip(request: Request) -> str:
    return request.client.host if request.client else ""


def _require_manager(current_admin: AdminUser) -> None:
    if current_admin.role == AdminRole.support:
        raise HTTPException(status_code=403, detail="Insufficient role")


def _read_app_meta(app: App) -> dict:
    raw = (app.description or "").strip()
    if not raw:
        return {"image_keys": {}}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            if "image_keys" not in data or not isinstance(data["image_keys"], dict):
                data["image_keys"] = {}
            return data
    except Exception:
        pass
    # Preserve legacy plain-text descriptions if present.
    return {"blurb": raw, "image_keys": {}}


def _write_app_meta(app: App, meta: dict) -> None:
    app.description = json.dumps(meta, separators=(",", ":"))


@router.get("/admin/apps", response_model=list[AdminAppOut])
async def list_apps(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[AdminAppOut]:
    res = await db.execute(select(App).order_by(App.created_at.asc()))
    apps = res.scalars().all()
    return [
        AdminAppOut(
            id=str(a.id),
            name=a.name,
            slug=a.slug,
            monthly_price_usd=float(a.monthly_price_usd),
            trial_days=a.trial_days,
            is_active=a.is_active,
        )
        for a in apps
    ]


@router.post("/admin/apps", response_model=AdminAppOut)
async def create_app(
    payload: AdminAppCreateRequest,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminAppOut:
    _require_manager(current_admin)

    slug = payload.slug.strip().lower().replace(" ", "")
    if not slug.isalnum():
        raise HTTPException(status_code=400, detail="Slug must be alphanumeric")

    exists_res = await db.execute(select(App).where(App.slug == slug))
    if exists_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An app with this slug already exists")

    app = App(
        name=payload.name.strip(),
        slug=slug,
        monthly_price_usd=payload.monthly_price_usd,
        trial_days=payload.trial_days,
        is_active=payload.is_active,
    )
    db.add(app)
    await db.flush()

    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="app.create",
            target_type="app",
            target_id=str(app.id),
            detail=payload.dict(),
            ip_address=_ip(request),
        )
    )
    await db.commit()
    await db.refresh(app)

    return AdminAppOut(
        id=str(app.id),
        name=app.name,
        slug=app.slug,
        monthly_price_usd=float(app.monthly_price_usd),
        trial_days=app.trial_days,
        is_active=app.is_active,
    )


@router.post("/admin/apps/{app_id}", response_model=AdminAppOut)
async def update_app(
    app_id: str,
    payload: AdminAppUpdateRequest,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminAppOut:
    _require_manager(current_admin)
    res = await db.execute(select(App).where(App.id == func.cast(app_id, String)))
    app = res.scalar_one_or_none()
    if not app:
        # fallback: app_id might be UUID string; cast other way around
        res = await db.execute(select(App).where(func.cast(App.id, String) == app_id))
        app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    if payload.name is not None:
        app.name = payload.name
    if payload.monthly_price_usd is not None:
        app.monthly_price_usd = payload.monthly_price_usd
    if payload.trial_days is not None:
        app.trial_days = payload.trial_days
    if payload.is_active is not None:
        app.is_active = payload.is_active

    # "Unpublish the app" when deactivating it:
    # make sure no release is returned as "latest" for clients.
    if payload.is_active is False:
        await db.execute(
            update(Release).where(Release.app_id == app.id).values(is_published=False)
        )

    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="app.update",
            target_type="app",
            target_id=str(app.id),
            detail=payload.dict(),
            ip_address=_ip(request),
        )
    )
    await db.commit()
    await db.refresh(app)

    return AdminAppOut(
        id=str(app.id),
        name=app.name,
        slug=app.slug,
        monthly_price_usd=float(app.monthly_price_usd),
        trial_days=app.trial_days,
        is_active=app.is_active,
    )


@router.get("/admin/apps/{app_id}/images")
async def list_app_images(
    app_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    res = await db.execute(select(App).where(func.cast(App.id, String) == app_id))
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    meta = _read_app_meta(app)
    image_keys = meta.get("image_keys") or {}
    image_urls: dict[str, str] = {}
    for tab, key in image_keys.items():
        try:
            image_urls[tab] = generate_presigned_get_url(key, expires_in=3600)
        except Exception:
            # If one key is invalid/missing, keep going for others.
            continue
    return {"app_id": str(app.id), "app_slug": app.slug, "images": image_urls}


@router.post("/admin/apps/{app_id}/images")
async def upload_app_image(
    app_id: str,
    request: Request,
    tab: str = Form(...),
    image_file: UploadFile = File(...),
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_manager(current_admin)
    tab_norm = (tab or "").strip().lower()
    if tab_norm not in VALID_IMAGE_TABS:
        raise HTTPException(status_code=400, detail=f"Invalid tab. Use one of: {', '.join(sorted(VALID_IMAGE_TABS))}")

    res = await db.execute(select(App).where(func.cast(App.id, String) == app_id))
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    filename = image_file.filename or f"{tab_norm}.png"
    key = f"apps/{app.slug}/images/{tab_norm}/{uuidlib.uuid4().hex}_{filename.replace(' ', '_')}"
    stored_url, _ = await upload_file_to_s3(image_file, key=key)

    meta = _read_app_meta(app)
    image_keys = meta.get("image_keys") or {}
    # Store the canonical key for future presigning.
    image_keys[tab_norm] = key
    meta["image_keys"] = image_keys
    _write_app_meta(app, meta)

    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="app.image.upload",
            target_type="app",
            target_id=str(app.id),
            detail={"tab": tab_norm, "key": key, "stored_url": stored_url},
            ip_address=_ip(request),
        )
    )
    await db.commit()

    return {
        "success": True,
        "app_id": str(app.id),
        "tab": tab_norm,
        "key": key,
        "url": generate_presigned_get_url(key, expires_in=3600),
    }


@router.delete("/admin/apps/{app_id}/images/{tab}")
async def delete_app_image(
    app_id: str,
    tab: str,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_manager(current_admin)
    tab_norm = (tab or "").strip().lower()
    if tab_norm not in VALID_IMAGE_TABS:
        raise HTTPException(status_code=400, detail=f"Invalid tab. Use one of: {', '.join(sorted(VALID_IMAGE_TABS))}")

    res = await db.execute(select(App).where(func.cast(App.id, String) == app_id))
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    meta = _read_app_meta(app)
    image_keys = meta.get("image_keys") or {}
    removed = image_keys.pop(tab_norm, None)
    meta["image_keys"] = image_keys
    _write_app_meta(app, meta)

    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="app.image.delete",
            target_type="app",
            target_id=str(app.id),
            detail={"tab": tab_norm, "removed_key": removed},
            ip_address=_ip(request),
        )
    )
    await db.commit()
    return {"success": True, "app_id": str(app.id), "tab": tab_norm}

