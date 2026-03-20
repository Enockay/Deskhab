"""
Deskhab API — entry point.

Routes:
  GET  /v1/health
  POST /v1/auth/login
  POST /v1/auth/register
  POST /v1/auth/refresh
  POST /v1/auth/logout
  GET  /v1/subscription/status
  GET  /v1/subscription/renewal-url
  POST /v1/subscription/checkout
  POST /v1/subscription/webhook/stripe
  GET  /v1/subscription/renew/{user_id}?token=...
  GET  /admin  (sqladmin panel)
"""

from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.core.config import settings
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.subscription import router as sub_router
from app.api.v1.endpoints.ws import router as ws_router
from app.api.v1.endpoints.devices import router as devices_router
from app.api.v1.endpoints.releases import router as releases_router
from app.api.v1.endpoints.admin_auth import router as admin_auth_router
from app.api.v1.endpoints.admin_users import router as admin_users_router
from app.api.v1.endpoints.admin_overview import router as admin_overview_router
from app.api.v1.endpoints.admin_app_users import router as admin_app_users_router
from app.api.v1.endpoints.admin_subscriptions import router as admin_subscriptions_router
from app.api.v1.endpoints.admin_payments import router as admin_payments_router
from app.api.v1.endpoints.admin_devices import router as admin_devices_router
from app.api.v1.endpoints.admin_apps import router as admin_apps_router
from app.api.v1.endpoints.admin_releases import router as admin_releases_router
from app.db.session import async_engine, sync_engine
from app.db.models import Base
from app.admin.panel import create_admin
from app.realtime.state import manager as ws_manager
from app.realtime import state as realtime_state
from app.realtime.pubsub import CHANNEL_PREFIX, subscribe_forever
from app.core.security import hash_password
from app.db.models import AdminUser, AdminRole
from sqlalchemy import select

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover
    Redis = None  # type: ignore[assignment]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting Deskhab API [{settings.APP_ENV}]")
    # Tables are managed by Alembic in production; auto-create only in dev
    if settings.APP_ENV == "development":
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    # Ensure first admin exists (safe to run in any env; creates only if none exist).
    try:
        from app.db.session import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            email = settings.FIRST_ADMIN_EMAIL.strip().lower()
            password = settings.FIRST_ADMIN_PASSWORD

            res = await db.execute(select(AdminUser).where(AdminUser.email == email))
            existing = res.scalar_one_or_none()
            if not existing:
                email = settings.FIRST_ADMIN_EMAIL.strip().lower()
                admin = AdminUser(
                    email=email,
                    hashed_password=hash_password(password),
                    name="First Admin",
                    role=AdminRole.admin,
                    is_active=True,
                    is_superadmin=True,
                )
                db.add(admin)
                await db.commit()
                logger.warning(
                    f"Created first admin user email={email}. Change FIRST_ADMIN_PASSWORD immediately."
                )
            else:
                # Dev convenience: allow changing FIRST_ADMIN_PASSWORD in .env and restarting to regain access.
                if settings.APP_ENV == "development":
                    existing.hashed_password = hash_password(password)
                    existing.is_active = True
                    await db.commit()
                    logger.warning(
                        f"Synced FIRST_ADMIN_PASSWORD for email={email} (development only)."
                    )
    except Exception as exc:
        logger.warning(f"Could not ensure first admin user exists: {exc}")

    # Optional Redis Pub/Sub fanout for websocket events (multi-instance support)
    task = None
    if Redis and settings.REDIS_URL:
        try:
            realtime_state.redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

            async def _runner():
                pattern = f"{CHANNEL_PREFIX}*"
                async for channel, raw in subscribe_forever(realtime_state.redis, pattern):
                    try:
                        import json
                        msg = json.loads(raw)
                        user_id = msg.get("user_id")
                        name = msg.get("name")
                        data = msg.get("data") or {}
                        if user_id and name:
                            await ws_manager.broadcast_user_event(user_id, name, data)
                    except Exception:
                        continue

            task = asyncio.create_task(_runner())
            logger.info("realtime redis pubsub enabled")
        except Exception as exc:
            logger.warning(f"realtime redis disabled: {exc}")
    yield
    logger.info("Shutting down")
    if task:
        task.cancel()
    if realtime_state.redis:
        try:
            await realtime_state.redis.close()
        except Exception:
            pass
    await async_engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Deskhab API",
        description="Backend API for Deskhab — SmartCalender and future desktop apps.",
        version="1.0.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/v1/health")
    async def health():
        return {"status": "ok", "service": "Deskhab API"}

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth_router, prefix="/v1", tags=["Auth"])
    app.include_router(sub_router, prefix="/v1", tags=["Subscription"])
    app.include_router(ws_router, prefix="/v1", tags=["Realtime"])
    app.include_router(devices_router, prefix="/v1", tags=["Devices"])
    app.include_router(admin_auth_router, prefix="/v1", tags=["AdminAuth"])
    app.include_router(admin_users_router, prefix="/v1", tags=["AdminUsers"])
    app.include_router(admin_overview_router, prefix="/v1", tags=["AdminOverview"])
    app.include_router(admin_app_users_router, prefix="/v1", tags=["AdminAppUsers"])
    app.include_router(admin_subscriptions_router, prefix="/v1", tags=["AdminSubscriptions"])
    app.include_router(admin_payments_router, prefix="/v1", tags=["AdminPayments"])
    app.include_router(admin_devices_router, prefix="/v1", tags=["AdminDevices"])
    app.include_router(admin_apps_router, prefix="/v1", tags=["AdminApps"])
    app.include_router(releases_router, prefix="/v1", tags=["Releases"])
    app.include_router(admin_releases_router, prefix="/v1", tags=["AdminReleases"])

    # ── Admin panel ───────────────────────────────────────────────────────────
    # sqladmin uses the sync engine for its queries
    from starlette.middleware.sessions import SessionMiddleware
    app.add_middleware(SessionMiddleware, secret_key=settings.ADMIN_SECRET_KEY)
    create_admin(app, sync_engine)

    # ── Global error handler ──────────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_error_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled error: {exc}")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "message": "Something went wrong"},
        )

    return app


app = create_app()