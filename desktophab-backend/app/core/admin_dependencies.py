from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_admin_access_token
from app.core.dependencies import get_db
from app.db.models import AdminRole, AdminUser


bearer_scheme = HTTPBearer(auto_error=False)


def _enforce_admin_ip_allowlist(request: Request) -> None:
    allow = (settings.ADMIN_ALLOWED_IPS or "").strip()
    if not allow:
        return
    allowed = {ip.strip() for ip in allow.split(",") if ip.strip()}
    client_ip = request.client.host if request.client else ""
    if client_ip not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_ip_not_allowed")


async def get_current_admin_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    _enforce_admin_ip_allowlist(request)
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = decode_admin_access_token(token)
        sub: str = payload.get("sub") or ""
        if not sub.startswith("admin:"):
            raise ValueError("bad sub")
        admin_id = int(sub.split("admin:", 1)[1])
    except (JWTError, ValueError, Exception):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    res = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = res.scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin inactive or not found")
    return admin


async def require_admin_role(
    current_admin: AdminUser = Depends(get_current_admin_user),
) -> AdminUser:
    if current_admin.role not in (AdminRole.admin,):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_admin

