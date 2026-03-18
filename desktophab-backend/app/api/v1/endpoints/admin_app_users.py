from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import String, cast, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_dependencies import get_current_admin_user
from app.core.dependencies import get_db
from app.db.models import AdminRole, AdminUser, AuditLog, RefreshToken, User
from app.schemas.admin_app_users import AppUserListResponse, AppUserOut


router = APIRouter()


def _ip(request: Request) -> str:
    return request.client.host if request.client else ""


def _require_mutation_role(current_admin: AdminUser) -> None:
    if current_admin.role == AdminRole.support:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


@router.get("/admin/app-users", response_model=AppUserListResponse)
async def list_app_users(
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AppUserListResponse:
    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))

    stmt = select(User).where(User.role == "user")
    if q and q.strip():
        needle = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.email).like(needle),
                cast(User.id, String).like(needle),
            )
        )

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(total_stmt)).scalar_one())

    res = await db.execute(
        stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)
    )
    users = list(res.scalars().all())
    return AppUserListResponse(
        total=total,
        items=[
            AppUserOut(
                id=str(u.id),
                email=u.email,
                name=u.name,
                is_active=u.is_active,
                is_email_verified=u.is_email_verified,
                created_at=u.created_at,
                last_login_at=u.last_login_at,
            )
            for u in users
        ],
    )


@router.get("/admin/app-users/{user_id}", response_model=AppUserOut)
async def get_app_user(
    user_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AppUserOut:
    res = await db.execute(select(User).where(cast(User.id, String) == user_id))
    u = res.scalar_one_or_none()
    if not u or (u.role.value if hasattr(u.role, "value") else str(u.role)) != "user":
        # keep privacy: don't expose admins through this endpoint
        raise HTTPException(status_code=404, detail="User not found")
    return AppUserOut(
        id=str(u.id),
        email=u.email,
        name=u.name,
        is_active=u.is_active,
        is_email_verified=u.is_email_verified,
        created_at=u.created_at,
        last_login_at=u.last_login_at,
    )


@router.post("/admin/app-users/{user_id}/disable", response_model=AppUserOut)
async def disable_app_user(
    user_id: str,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AppUserOut:
    _require_mutation_role(current_admin)
    res = await db.execute(select(User).where(cast(User.id, String) == user_id))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    u.is_active = False
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == u.id, RefreshToken.revoked == False)
        .values(revoked=True)
    )
    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="user.disable",
            target_type="user",
            target_id=str(u.id),
            detail={"email": u.email},
            ip_address=_ip(request),
        )
    )
    await db.commit()
    return AppUserOut(
        id=str(u.id),
        email=u.email,
        name=u.name,
        is_active=u.is_active,
        is_email_verified=u.is_email_verified,
        created_at=u.created_at,
        last_login_at=u.last_login_at,
    )


@router.post("/admin/app-users/{user_id}/enable", response_model=AppUserOut)
async def enable_app_user(
    user_id: str,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AppUserOut:
    _require_mutation_role(current_admin)
    res = await db.execute(select(User).where(cast(User.id, String) == user_id))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    u.is_active = True
    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="user.enable",
            target_type="user",
            target_id=str(u.id),
            detail={"email": u.email},
            ip_address=_ip(request),
        )
    )
    await db.commit()
    return AppUserOut(
        id=str(u.id),
        email=u.email,
        name=u.name,
        is_active=u.is_active,
        is_email_verified=u.is_email_verified,
        created_at=u.created_at,
        last_login_at=u.last_login_at,
    )


@router.post("/admin/app-users/{user_id}/force-logout")
async def force_logout_app_user(
    user_id: str,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_mutation_role(current_admin)
    res = await db.execute(select(User).where(cast(User.id, String) == user_id))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == u.id, RefreshToken.revoked == False)
        .values(revoked=True)
        .execution_options(synchronize_session=False)
    )
    revoked_count = int(result.rowcount or 0)
    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="user.force_logout",
            target_type="user",
            target_id=str(u.id),
            detail={"email": u.email, "revoked_refresh_tokens": revoked_count},
            ip_address=_ip(request),
        )
    )
    await db.commit()
    return {"ok": True, "revoked_refresh_tokens": revoked_count}

