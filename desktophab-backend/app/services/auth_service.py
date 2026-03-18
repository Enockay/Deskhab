"""Auth service: login, register, token refresh, logout."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    verify_password, hash_password,
    create_access_token, generate_refresh_token, hash_token,
)
from app.db.models import User, RefreshToken, Subscription, App
from app.schemas.auth import LoginRequest, RegisterRequest, AuthResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Login ─────────────────────────────────────────────────────────────────

    async def login(self, req: LoginRequest) -> AuthResponse:
        user = await self._get_user_by_email(req.email)
        if not user or not verify_password(req.password, user.hashed_password):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise PermissionError("Account is disabled")

        # Issue tokens
        expire_minutes = (
            settings.REMEMBER_ME_EXPIRE_DAYS * 24 * 60
            if req.remember_me
            else settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        access_token, token_expires_at = create_access_token(
            subject=str(user.id),
            role=user.role.value,
            expires_delta=timedelta(minutes=expire_minutes),
        )
        refresh_token_raw = generate_refresh_token()
        await self._store_refresh_token(user.id, refresh_token_raw, req.remember_me)

        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        await self.db.commit()

        return await self._build_auth_response(user, access_token, token_expires_at, refresh_token_raw)

    # ── Register ──────────────────────────────────────────────────────────────

    async def register(self, req: RegisterRequest) -> AuthResponse:
        email = req.email.strip().lower()
        existing = await self._get_user_by_email(email)
        if existing:
            raise ValueError("An account with this email already exists")

        user = User(
            email=email,
            hashed_password=hash_password(req.password),
            name=req.name,
        )
        self.db.add(user)
        await self.db.flush()  # get user.id

        # Auto-create SmartCalender trial subscription
        app = await self._get_app_by_slug("smartcalender")
        if app:
            now = datetime.now(timezone.utc)
            sub = Subscription(
                user_id=user.id,
                app_id=app.id,
                status="trial",
                tier="premium",
                features=["all_views", "tasks_board", "reminders"],
                trial_ends_at=now + timedelta(days=app.trial_days),
                current_period_start=now,
                current_period_end=now + timedelta(days=app.trial_days),
            )
            self.db.add(sub)

        await self.db.commit()
        await self.db.refresh(user)

        # Issue tokens immediately
        access_token, token_expires_at = create_access_token(str(user.id), role=user.role.value)
        refresh_token_raw = generate_refresh_token()
        await self._store_refresh_token(user.id, refresh_token_raw, remember_me=False)
        await self.db.commit()

        return await self._build_auth_response(user, access_token, token_expires_at, refresh_token_raw)

    # ── Refresh ───────────────────────────────────────────────────────────────

    async def refresh_access_token(self, raw_refresh_token: str) -> AuthResponse:
        token_hash = hash_token(raw_refresh_token)
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        stored = result.scalar_one_or_none()
        if not stored:
            raise ValueError("Refresh token invalid or expired")

        user = await self._get_user_by_id(stored.user_id)
        if not user or not user.is_active:
            raise PermissionError("Account inactive")

        # Rotate: revoke old, issue new
        stored.revoked = True
        access_token, token_expires_at = create_access_token(str(user.id), role=user.role.value)
        new_raw = generate_refresh_token()
        await self._store_refresh_token(user.id, new_raw, remember_me=False)
        await self.db.commit()

        return await self._build_auth_response(user, access_token, token_expires_at, new_raw)

    # ── Logout ────────────────────────────────────────────────────────────────

    async def logout(self, raw_refresh_token: str) -> None:
        token_hash = hash_token(raw_refresh_token)
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        stored = result.scalar_one_or_none()
        if stored:
            stored.revoked = True
            await self.db.commit()

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _build_auth_response(
        self,
        user: User,
        access_token: str,
        token_expires_at: datetime,
        refresh_token: str,
    ) -> AuthResponse:
        from app.schemas.auth import AuthResponse, SubscriptionOut, OrganizationOut

        # Get the SmartCalender subscription for this user
        result = await self.db.execute(
            select(Subscription)
            .join(App, App.id == Subscription.app_id)
            .where(
                Subscription.user_id == user.id,
                App.slug == "smartcalender",
            )
        )
        sub = result.scalar_one_or_none()

        sub_out = SubscriptionOut(
            tier=sub.tier.value if sub else "free",
            status=sub.status.value if sub else "expired",
            expires_at=sub.current_period_end if sub else None,
            features=sub.features if sub else [],
        )

        return AuthResponse(
            user_id=str(user.id),
            email=user.email,
            name=user.name or "",
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
            subscription=sub_out,
            subscription_expires_at=sub.current_period_end if sub else None,
            timezone=user.timezone or "UTC",
            language=user.language or "en",
            avatar_url=user.avatar_url,
            organization=OrganizationOut(
                id=user.organization_id,
                name=user.organization_name,
            ) if user.organization_id else None,
            role=user.role.value,
            server_timestamp=datetime.now(timezone.utc),
        )

    async def _get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def _get_user_by_id(self, user_id: UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def _get_app_by_slug(self, slug: str) -> App | None:
        result = await self.db.execute(select(App).where(App.slug == slug))
        return result.scalar_one_or_none()

    async def _store_refresh_token(self, user_id: UUID, raw: str, remember_me: bool) -> None:
        days = settings.REMEMBER_ME_EXPIRE_DAYS if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
        token = RefreshToken(
            user_id=user_id,
            token_hash=hash_token(raw),
            expires_at=datetime.now(timezone.utc) + timedelta(days=days),
        )
        self.db.add(token)