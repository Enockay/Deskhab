from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_dependencies import get_current_admin_user, require_admin_role
from app.core.dependencies import get_db
from app.core.security import hash_password
from app.db.models import AdminRole, AdminUser, AuditLog, utcnow
from app.schemas.admin_users import AdminUserCreateRequest, AdminUserOut


router = APIRouter()


def _ip(request: Request) -> str:
    return request.client.host if request.client else ""


@router.get("/admin/users", response_model=list[AdminUserOut])
async def list_admin_users(
    _: AdminUser = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
) -> list[AdminUserOut]:
    res = await db.execute(select(AdminUser).order_by(AdminUser.id.asc()))
    admins = list(res.scalars().all())
    return [
        AdminUserOut(
            id=a.id,
            email=a.email,
            name=a.name,
            role=a.role.value if hasattr(a.role, "value") else str(a.role),
            is_active=a.is_active,
        )
        for a in admins
    ]


@router.post("/admin/users", response_model=AdminUserOut)
async def create_admin_user(
    payload: AdminUserCreateRequest,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    role_map = {
        "support": AdminRole.support,
        "manager": AdminRole.manager,
        "admin": AdminRole.admin,
    }
    role = role_map.get(payload.role)
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Only admin can create another admin; managers can create support/manager
    if role == AdminRole.admin and current_admin.role != AdminRole.admin:
        raise HTTPException(status_code=403, detail="Admin role required to create admin users")

    exists = await db.execute(select(AdminUser).where(AdminUser.email == payload.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Admin user already exists")

    admin = AdminUser(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        role=role,
        is_active=True,
        is_superadmin=(role == AdminRole.admin),
    )
    db.add(admin)
    await db.flush()

    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="admin_user.create",
            target_type="admin_user",
            target_id=str(admin.id),
            detail={"email": admin.email, "role": admin.role.value},
            ip_address=_ip(request),
        )
    )
    await db.commit()
    return AdminUserOut(
        id=admin.id,
        email=admin.email,
        name=admin.name,
        role=admin.role.value,
        is_active=admin.is_active,
    )


@router.post("/admin/users/{admin_id}/disable", response_model=AdminUserOut)
async def disable_admin_user(
    admin_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    if current_admin.id == admin_id:
        raise HTTPException(status_code=400, detail="Cannot disable yourself")

    res = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = res.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")

    admin.is_active = False
    admin.last_login_at = admin.last_login_at  # no-op to keep diff small
    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="admin_user.disable",
            target_type="admin_user",
            target_id=str(admin.id),
            detail={"email": admin.email},
            ip_address=_ip(request),
        )
    )
    await db.commit()
    return AdminUserOut(
        id=admin.id,
        email=admin.email,
        name=admin.name,
        role=admin.role.value if hasattr(admin.role, "value") else str(admin.role),
        is_active=admin.is_active,
    )


@router.post("/admin/users/{admin_id}/enable", response_model=AdminUserOut)
async def enable_admin_user(
    admin_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    res = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = res.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")

    admin.is_active = True
    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="admin_user.enable",
            target_type="admin_user",
            target_id=str(admin.id),
            detail={"email": admin.email},
            ip_address=_ip(request),
        )
    )
    await db.commit()
    return AdminUserOut(
        id=admin.id,
        email=admin.email,
        name=admin.name,
        role=admin.role.value if hasattr(admin.role, "value") else str(admin.role),
        is_active=admin.is_active,
    )

