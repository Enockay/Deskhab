from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import String, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_dependencies import get_current_admin_user
from app.core.dependencies import get_db
from app.db.models import AdminRole, AdminUser, App, AuditLog, Release
from app.schemas.admin_apps import AdminAppOut, AdminAppUpdateRequest


router = APIRouter()


def _ip(request: Request) -> str:
    return request.client.host if request.client else ""


def _require_manager(current_admin: AdminUser) -> None:
    if current_admin.role == AdminRole.support:
        raise HTTPException(status_code=403, detail="Insufficient role")


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

