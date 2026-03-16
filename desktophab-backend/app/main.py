"""
DesktopHab API — entry point.

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

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.core.config import settings
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.subscription import router as sub_router
from app.db.session import async_engine, sync_engine
from app.db.models import Base
from app.admin.panel import create_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting DesktopHab API [{settings.APP_ENV}]")
    # Tables are managed by Alembic in production; auto-create only in dev
    if settings.APP_ENV == "development":
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    logger.info("Shutting down")
    await async_engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="DesktopHab API",
        description="Backend API for DesktopHab — SmartCalender and future desktop apps.",
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
        return {"status": "ok", "service": "DesktopHab API"}

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth_router, prefix="/v1", tags=["Auth"])
    app.include_router(sub_router, prefix="/v1", tags=["Subscription"])

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