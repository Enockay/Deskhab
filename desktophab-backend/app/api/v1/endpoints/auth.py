from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import LoginRequest, AuthResponse, VerifyEmailRequest
from app.services.email import send_verification_email
from app.core.config import settings
from app.db.models import EmailVerification, User
from app.db.session import AsyncSessionLocal

from sqlalchemy import select

import secrets
import string

router = APIRouter()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


@router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
  # TODO: delegate to auth_service.login
    return AuthResponse(
        access_token="demo",  # placeholder
        refresh_token="demo",
        token_expires_at=None,  # type: ignore[arg-type]
        subscription=None,  # type: ignore[arg-type]
        subscription_expires_at=None,
        server_timestamp=None,  # type: ignore[arg-type]
    )


@router.post("/auth/register")
async def register(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """
    Temporary implementation:
    - generate a 6‑digit code
    - email it via Brevo
    - return success (verification storage will be added later)
    """
    # Disallow multiple accounts with the same email
    existing_user = await db.execute(select(User).where(User.email == payload.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    alphabet = string.digits
    code = ''.join(secrets.choice(alphabet) for _ in range(6))

    display_name = payload.email.split("@", 1)[0]
    await send_verification_email(email=payload.email, code=code, name=display_name)

    # store hashed code
    from app.core.security import hash_token
    from datetime import datetime, timedelta, timezone

    code_hash = hash_token(code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    verification = EmailVerification(
        email=payload.email,
        code_hash=code_hash,
        expires_at=expires_at,
    )
    db.add(verification)
    await db.commit()

    if settings.DEBUG:
        # In dev we return the code so you can test quickly from the frontend / logs.
        return {"success": True, "code": code}

    return {"success": True}


@router.post("/auth/refresh", response_model=AuthResponse)
async def refresh() -> AuthResponse:
  # TODO: implement token refresh
    return AuthResponse(
        access_token="demo",  # placeholder
        refresh_token="demo",
        token_expires_at=None,  # type: ignore[arg-type]
        subscription=None,  # type: ignore[arg-type]
        subscription_expires_at=None,
        server_timestamp=None,  # type: ignore[arg-type]
    )


@router.post("/auth/logout")
async def logout() -> dict:
  # TODO: implement logout / token revocation
  return {"success": True}


@router.post("/auth/verify-email")
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)) -> dict:
    from app.core.security import hash_token
    from datetime import datetime, timezone

    code_hash = hash_token(payload.code)

    result = await db.execute(
        select(EmailVerification)
        .where(
            EmailVerification.email == payload.email,
            EmailVerification.code_hash == code_hash,
            EmailVerification.consumed == False,
            EmailVerification.expires_at > datetime.now(timezone.utc),
        )
        .order_by(EmailVerification.created_at.desc())
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    verification.consumed = True

    user_result = await db.execute(select(User).where(User.email == payload.email))
    user = user_result.scalar_one_or_none()
    if user:
        user.is_email_verified = True

    await db.commit()

    return {"success": True}

