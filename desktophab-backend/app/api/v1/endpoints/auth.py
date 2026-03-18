from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import LoginRequest, AuthResponse, VerifyEmailRequest
from app.services.email import send_verification_email
from app.core.config import settings
from app.db.models import EmailVerification, User, PasswordReset
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


@router.post("/auth/forgot-password")
async def forgot_password(
    email: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Request a password reset email. Always returns success to avoid account enumeration.
    """
    from datetime import datetime, timedelta, timezone
    from app.core.security import generate_refresh_token, hash_token
    from app.services.email import send_password_reset_email

    normalized = email.strip().lower()

    # Best-effort: if email exists, create a token + send link. If not, still return success.
    user_res = await db.execute(select(User).where(func.lower(User.email) == normalized))
    user = user_res.scalar_one_or_none()
    if not user:
        logger.info(f"forgot-password requested for unknown email={normalized}")
        return {"success": True}

    # Rate limit: once per 60 seconds per email
    last_res = await db.execute(
        select(PasswordReset)
        .where(func.lower(PasswordReset.email) == normalized)
        .order_by(PasswordReset.created_at.desc())
        .limit(1)
    )
    last = last_res.scalars().first()
    if last and last.created_at:
        now = datetime.now(timezone.utc)
        created_at = last.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if (now - created_at) < timedelta(seconds=60):
            return {"success": True}

    raw = generate_refresh_token()
    token_hash = hash_token(raw)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.add(
        PasswordReset(
            email=normalized,
            token_hash=token_hash,
            expires_at=expires_at,
        )
    )
    await db.commit()

    reset_url = f"{settings.SITE_URL.rstrip('/')}/reset-password?token={raw}"
    await send_password_reset_email(normalized, reset_url=reset_url)
    logger.info(f"forgot-password email sent email={normalized} user_id={user.id}")
    return {"success": True}


@router.post("/auth/reset-password")
async def reset_password(
    token: str = Query(...),
    new_password: str = Query(..., min_length=8),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Reset password given a valid reset token.
    """
    from datetime import datetime, timezone
    from app.core.security import hash_token, hash_password

    token_hash = hash_token(token)

    res = await db.execute(
        select(PasswordReset)
        .where(
            PasswordReset.token_hash == token_hash,
            PasswordReset.consumed == False,
            PasswordReset.expires_at > datetime.now(timezone.utc),
        )
        .order_by(PasswordReset.created_at.desc())
        .limit(1)
    )
    pr = res.scalars().first()
    if not pr:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user_res = await db.execute(select(User).where(func.lower(User.email) == pr.email))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(new_password)
    pr.consumed = True
    await db.commit()
    logger.info(f"password reset successful email={pr.email} user_id={user.id}")
    return {"success": True}

