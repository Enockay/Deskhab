"""FastAPI dependencies: DB sessions, current user extraction, admin guards."""

from typing import AsyncGenerator

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.db.models import User, AdminUser
from app.services.user_service import UserService

bearer_scheme = HTTPBearer(auto_error=False)


# ─── DB session ───────────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ─── Current user from Bearer token ──────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise ValueError("Missing subject")
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    svc = UserService(db)
    user = await svc.get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive or not found")
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


# ─── Token from query param (renewal URL flow) ────────────────────────────────

async def get_user_from_token_param(
    token: str = Query(..., description="Access token from renewal URL"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Used by the renewal web page: /renew-smartcalender/{user_id}?token=...
    Validates the JWT passed as a query param.
    """
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
    except (JWTError, Exception):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    svc = UserService(db)
    user = await svc.get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not found")
    return user