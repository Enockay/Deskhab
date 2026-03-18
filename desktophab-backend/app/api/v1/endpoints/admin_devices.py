from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_dependencies import get_current_admin_user
from app.core.dependencies import get_db
from app.db.models import AdminRole, AdminUser, AuditLog, DeviceBinding, User
from app.schemas.admin_devices import AdminDeviceBindingOut, AdminDeviceListResponse


router = APIRouter()


def _ip(request: Request) -> str:
    return request.client.host if request.client else ""


def _require_manager(current_admin: AdminUser) -> None:
    if current_admin.role == AdminRole.support:
        raise HTTPException(status_code=403, detail="Insufficient role")


@router.get("/admin/devices", response_model=AdminDeviceListResponse)
async def list_devices(
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminDeviceListResponse:
    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))

    stmt = (
        select(DeviceBinding, User)
        .join(User, DeviceBinding.user_id == User.id)
    )

    if q and q.strip():
        needle = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.email).like(needle),
                func.lower(DeviceBinding.device_id).like(needle),
            )
        )

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(total_stmt)).scalar_one())

    res = await db.execute(
        stmt.order_by(DeviceBinding.last_seen_at.desc().nullslast()).limit(limit).offset(offset)
    )
    rows = res.all()

    items: list[AdminDeviceBindingOut] = []
    for binding, user in rows:
        items.append(
            AdminDeviceBindingOut(
                id=str(binding.id),
                user_id=str(binding.user_id),
                email=user.email,
                device_id=binding.device_id,
                device_name=binding.device_name,
                platform=binding.platform,
                last_seen_at=binding.last_seen_at,
                created_at=binding.created_at,
            )
        )
    return AdminDeviceListResponse(total=total, items=items)


@router.post("/admin/devices/{binding_id}/unbind")
async def unbind_device(
    binding_id: str,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_manager(current_admin)
    res = await db.execute(
        select(DeviceBinding, User)
        .join(User, DeviceBinding.user_id == User.id)
        .where(cast(DeviceBinding.id, String) == binding_id)
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Binding not found")
    binding, user = row

    await db.delete(binding)
    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="device.unbind",
            target_type="device_binding",
            target_id=str(binding.id),
            detail={"user_id": str(binding.user_id), "device_id": binding.device_id},
            ip_address=_ip(request),
        )
    )
    await db.commit()
    return {"ok": True}

