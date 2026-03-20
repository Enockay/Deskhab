from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timezone

from app.schemas.auth import LoginRequest, RegisterRequest, AuthResponse, VerifyEmailRequest
from app.schemas.me import MeResponse
from app.services.email import send_verification_email, send_post_verification_login_email
from app.core.config import settings
from app.db.models import EmailVerification, User, PasswordReset
from app.db.session import AsyncSessionLocal
from app.services.auth_service import AuthService

from sqlalchemy import select, func

import secrets
import string

from app.core.dependencies import get_current_user
from app.db.models import Subscription, App, SubscriptionStatus, SubscriptionTier

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
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """
    Temporary implementation:
    - generate a 6‑digit code
    - email it via Brevo
    - return success (verification storage will be added later)
    """
    # Normalize email so duplicates can't slip through via casing/whitespace
    email = payload.email.strip().lower()

    # If user already exists:
    # - if verified: reject as duplicate
    # - if not verified: allow continuing and just (re)send/reuse verification code
    existing_user = await db.execute(select(User).where(func.lower(User.email) == email))
    existing = existing_user.scalar_one_or_none()
    if existing and existing.is_email_verified:
        logger.info(f"Duplicate register attempt for verified email={email} user_id={existing.id}")
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Ensure a user row exists before payment flow (Paystack verify looks up User by email).
    if not existing:
        from app.core.security import hash_password
        user = User(
            email=email,
            hashed_password=hash_password(payload.password),
            name=payload.name,
            is_email_verified=False,
        )
        db.add(user)
        await db.flush()
        logger.info(f"User created pending verification email={email} user_id={user.id}")
    else:
        logger.info(f"Register continued for existing unverified email={email} user_id={existing.id}")

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
        await db.commit()
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


@router.get("/auth/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> MeResponse:
    """
    "Sync Now" endpoint for the desktop app: refresh user profile + subscription.
    """
    result = await db.execute(
        select(Subscription)
        .join(App, App.id == Subscription.app_id)
        .where(
            Subscription.user_id == current_user.id,
            App.slug == "smartcalender",
        )
    )
    sub = result.scalar_one_or_none()

    sub_out = {
        "tier": sub.tier.value if sub else "free",
        "status": sub.status.value if sub else "expired",
        "expires_at": sub.current_period_end if sub else None,
        "features": sub.features if sub else [],
    }

    org = None
    if current_user.organization_id:
        org = {"id": current_user.organization_id, "name": current_user.organization_name}

    return MeResponse(
        user_id=str(current_user.id),
        email=current_user.email,
        name=current_user.name or "",
        timezone=current_user.timezone or "UTC",
        language=current_user.language or "en",
        avatar_url=current_user.avatar_url,
        organization=org,  # type: ignore[arg-type]
        role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        subscription=sub_out,  # type: ignore[arg-type]
        subscription_expires_at=sub.current_period_end if sub else None,
        server_timestamp=datetime.now(timezone.utc),
    )


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
        # Start user with a 5-day trial (no upfront charge).
        app_res = await db.execute(select(App).where(App.slug == "smartcalender"))
        app = app_res.scalar_one_or_none()
        if not app:
            app = App(
                slug="smartcalender",
                name="SmartCalender",
                monthly_price_usd=2.00,
                trial_days=5,
                is_active=True,
            )
            db.add(app)
            await db.flush()

        sub_res = await db.execute(
            select(Subscription).where(
                Subscription.user_id == existing_user.id,
                Subscription.app_id == app.id,
            )
        )
        sub = sub_res.scalar_one_or_none()
        if not sub:
            from datetime import timedelta

            now = datetime.now(timezone.utc)
            trial_end = now + timedelta(days=max(1, int(app.trial_days or 5)))
            sub = Subscription(
                user_id=existing_user.id,
                app_id=app.id,
                tier=SubscriptionTier.premium,
                status=SubscriptionStatus.trial,
                features=["all_views", "tasks_board", "reminders", "advanced_reminders"],
                trial_ends_at=trial_end,
                current_period_start=now,
                current_period_end=trial_end,
            )
            db.add(sub)

    await db.commit()

    # Best-effort: send login reminder details after successful verification.
    try:
        await send_post_verification_login_email(email=email)
    except Exception as exc:
        logger.warning(f"post-verification login email failed for email={email}: {exc}")

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

    reset_url = f"{settings.PASSWORD_RESET_BASE_URL.rstrip('/')}/reset-password?token={raw}"
    try:
        await send_password_reset_email(normalized, reset_url=reset_url)
        logger.info(f"forgot-password email sent email={normalized} user_id={user.id}")
    except Exception as exc:
        # Best-effort event for admin overview metrics
        try:
            from app.db.models import SystemEventType
            from app.services.system_events import record_event

            await record_event(
                db,
                type=SystemEventType.email,
                name="email.password_reset.failed",
                level="error",
                user_id=user.id,
                message=str(exc),
                meta={"email": normalized},
            )
        except Exception:
            pass
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

