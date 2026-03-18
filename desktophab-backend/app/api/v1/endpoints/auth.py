from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import LoginRequest, AuthResponse, VerifyEmailRequest
from app.services.email import send_verification_email
from app.core.config import settings
from app.db.models import EmailVerification, User
from app.db.session import AsyncSessionLocal
from app.services.auth_service import AuthService

from sqlalchemy import select, func

import secrets
import string

router = APIRouter()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


@router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    """
    Real login endpoint backed by AuthService.
    """
    svc = AuthService(db)
    try:
        return await svc.login(payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post("/auth/register")
async def register(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """
    Temporary implementation:
    - generate a 6‑digit code
    - email it via Brevo
    - return success (verification storage will be added later)
    """
    # Normalize email so duplicates can't slip through via casing/whitespace
    email = payload.email.strip().lower()

    # Disallow multiple accounts with the same email (case-insensitive)
    existing_user = await db.execute(select(User).where(func.lower(User.email) == email))
    existing = existing_user.scalar_one_or_none()
    if existing:
        logger.info(f"Duplicate register attempt for existing email={email} user_id={existing.id}")
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # If there's already an unexpired, unconsumed verification, don't spam-create more
    from datetime import datetime, timezone
    existing_ver = await db.execute(
        select(EmailVerification)
        .where(
            func.lower(EmailVerification.email) == email,
            EmailVerification.consumed == False,
            EmailVerification.expires_at > datetime.now(timezone.utc),
        )
        .order_by(EmailVerification.created_at.desc())
    )
    verification_row = existing_ver.scalar_one_or_none()
    if verification_row:
        logger.info(f"Register requested again for email={email}; reusing existing verification id={verification_row.id}")
        return {"success": True}

    alphabet = string.digits
    code = ''.join(secrets.choice(alphabet) for _ in range(6))

    display_name = email.split("@", 1)[0]
    await send_verification_email(email=email, code=code, name=display_name)

    # store hashed code
    from app.core.security import hash_token
    from datetime import datetime, timedelta, timezone

    code_hash = hash_token(code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    verification = EmailVerification(
        email=email,
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

    email = payload.email.strip().lower()

    # If the user already exists and is verified, skip the verification step.
    existing_user_res = await db.execute(select(User).where(func.lower(User.email) == email))
    existing_user = existing_user_res.scalar_one_or_none()
    if existing_user and existing_user.is_email_verified:
        logger.info(f"verify-email skipped; already verified email={email} user_id={existing_user.id}")
        return {"success": True, "skipped": True}

    code_hash = hash_token(payload.code)

    result = await db.execute(
        select(EmailVerification)
        .where(
            func.lower(EmailVerification.email) == email,
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

    if existing_user:
        existing_user.is_email_verified = True

    await db.commit()

    return {"success": True}


@router.get("/auth/email-status")
async def email_status(
    email: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Lightweight helper for the web onboarding flow.
    Lets the frontend skip /verify-email if the email is already verified.
    """
    normalized = email.strip().lower()
    res = await db.execute(select(User).where(func.lower(User.email) == normalized))
    user = res.scalar_one_or_none()
    return {"email": normalized, "is_verified": bool(user and user.is_email_verified)}


@router.post("/auth/resend-code")
async def resend_code(
    email: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Resend a new 6-digit verification code (rate-limited).
    """
    from datetime import datetime, timedelta, timezone
    from app.core.security import hash_token

    normalized = email.strip().lower()

    # If already verified, nothing to do.
    user_res = await db.execute(select(User).where(func.lower(User.email) == normalized))
    user = user_res.scalar_one_or_none()
    if user and user.is_email_verified:
        return {"success": True, "skipped": True}

    # Rate limit: only one send per 60 seconds per email
    last_res = await db.execute(
        select(EmailVerification)
        .where(func.lower(EmailVerification.email) == normalized)
        .order_by(EmailVerification.created_at.desc())
        .limit(1)
    )
    last = last_res.scalars().first()
    if last and last.created_at:
        now = datetime.now(timezone.utc)
        # created_at may be naive depending on DB; handle both
        created_at = last.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if (now - created_at) < timedelta(seconds=60):
            raise HTTPException(status_code=429, detail="Please wait a moment before requesting another code.")

    alphabet = string.digits
    code = ''.join(secrets.choice(alphabet) for _ in range(6))
    await send_verification_email(email=normalized, code=code, name=normalized.split("@", 1)[0])

    verification = EmailVerification(
        email=normalized,
        code_hash=hash_token(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    db.add(verification)
    await db.commit()

    if settings.DEBUG:
        return {"success": True, "code": code}
    return {"success": True}

