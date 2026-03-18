from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    verify_password,
    generate_refresh_token,
    hash_token,
    create_admin_access_token,
)
from app.core.admin_dependencies import get_current_admin_user
from app.core.dependencies import get_db
from app.db.models import AdminRefreshToken, AdminUser, utcnow
from app.schemas.admin_auth import AdminAuthResponse, AdminLoginRequest, AdminMeResponse


router = APIRouter()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else ""


@router.post("/admin/auth/login", response_model=AdminAuthResponse)
async def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AdminAuthResponse:
    # Optional IP allowlist
    allow = (settings.ADMIN_ALLOWED_IPS or "").strip()
    if allow:
        allowed = {ip.strip() for ip in allow.split(",") if ip.strip()}
        if _client_ip(request) not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_ip_not_allowed")

    email = payload.email.strip().lower()
    res = await db.execute(select(AdminUser).where(AdminUser.email == email))
    admin = res.scalar_one_or_none()
    if not admin or not admin.is_active or not verify_password(payload.password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Token expiry
    access_minutes = settings.ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES
    refresh_days = settings.ADMIN_REFRESH_TOKEN_EXPIRE_DAYS
    if payload.remember_me:
        refresh_days = max(refresh_days, settings.REMEMBER_ME_EXPIRE_DAYS)
        access_minutes = max(access_minutes, settings.ACCESS_TOKEN_EXPIRE_MINUTES)  # keep sane floor

    access_token, token_expires_at = create_admin_access_token(
        admin_id=admin.id,
        role=admin.role.value if hasattr(admin.role, "value") else str(admin.role),
        expires_delta=timedelta(minutes=access_minutes),
    )

    refresh_raw = generate_refresh_token()
    db.add(
        AdminRefreshToken(
            admin_id=admin.id,
            token_hash=hash_token(refresh_raw),
            expires_at=datetime.now(timezone.utc) + timedelta(days=refresh_days),
        )
    )
    admin.last_login_at = utcnow()
    await db.commit()

    return AdminAuthResponse(
        admin_id=admin.id,
        email=admin.email,
        name=admin.name or "",
        role=admin.role.value if hasattr(admin.role, "value") else str(admin.role),
        access_token=access_token,
        refresh_token=refresh_raw,
        token_expires_at=token_expires_at,
        server_timestamp=datetime.now(timezone.utc),
    )


@router.post("/admin/auth/refresh", response_model=AdminAuthResponse)
async def admin_refresh(
    refresh_token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AdminAuthResponse:
    # Optional IP allowlist
    allow = (settings.ADMIN_ALLOWED_IPS or "").strip()
    if allow:
        allowed = {ip.strip() for ip in allow.split(",") if ip.strip()}
        if _client_ip(request) not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_ip_not_allowed")

    token_hash = hash_token(refresh_token)
    res = await db.execute(
        select(AdminRefreshToken).where(
            AdminRefreshToken.token_hash == token_hash,
            AdminRefreshToken.revoked == False,
            AdminRefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    stored = res.scalar_one_or_none()
    if not stored:
        raise HTTPException(status_code=401, detail="Refresh token invalid or expired")

    res = await db.execute(select(AdminUser).where(AdminUser.id == stored.admin_id))
    admin = res.scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=403, detail="Admin inactive or not found")

    stored.revoked = True
    access_token, token_expires_at = create_admin_access_token(
        admin_id=admin.id,
        role=admin.role.value if hasattr(admin.role, "value") else str(admin.role),
    )
    new_raw = generate_refresh_token()
    db.add(
        AdminRefreshToken(
            admin_id=admin.id,
            token_hash=hash_token(new_raw),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.ADMIN_REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    await db.commit()

    return AdminAuthResponse(
        admin_id=admin.id,
        email=admin.email,
        name=admin.name or "",
        role=admin.role.value if hasattr(admin.role, "value") else str(admin.role),
        access_token=access_token,
        refresh_token=new_raw,
        token_expires_at=token_expires_at,
        server_timestamp=datetime.now(timezone.utc),
    )


@router.post("/admin/auth/logout")
async def admin_logout(
    refresh_token: str,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    token_hash = hash_token(refresh_token)
    res = await db.execute(select(AdminRefreshToken).where(AdminRefreshToken.token_hash == token_hash))
    stored = res.scalar_one_or_none()
    if stored:
        stored.revoked = True
        await db.commit()
    return {"status": "ok"}


@router.get("/admin/auth/me", response_model=AdminMeResponse)
async def admin_me(current_admin: AdminUser = Depends(get_current_admin_user)) -> AdminMeResponse:
    return AdminMeResponse(
        admin_id=current_admin.id,
        email=current_admin.email,
        name=current_admin.name or "",
        role=current_admin.role.value if hasattr(current_admin.role, "value") else str(current_admin.role),
        is_active=current_admin.is_active,
        last_login_at=current_admin.last_login_at,
    )

