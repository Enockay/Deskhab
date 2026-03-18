from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_dependencies import get_current_admin_user
from app.core.dependencies import get_db
from app.core.config import settings
from app.db.models import (
    AdminUser,
    User,
    Subscription,
    SubscriptionStatus,
    Payment,
    PaymentStatus,
    DeviceBinding,
    AuditLog,
    SystemEvent,
    SystemEventType,
)
from app.realtime.state import manager as ws_manager, redis as ws_redis


router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/admin/overview")
async def admin_overview(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    now = _utcnow()
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    last_7 = now - timedelta(days=7)
    last_30 = now - timedelta(days=30)
    last_24h = now - timedelta(hours=24)
    last_10m = now - timedelta(minutes=10)

    # ── Users snapshot ───────────────────────────────────────────────────────
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    new_users_today = (
        await db.execute(select(func.count()).select_from(User).where(User.created_at >= day_start))
    ).scalar_one()
    verified_users = (
        await db.execute(select(func.count()).select_from(User).where(User.is_email_verified == True))
    ).scalar_one()
    verified_pct = float(verified_users) / float(total_users) * 100.0 if total_users else 0.0

    # ── Subscription snapshot (SmartCalender) ────────────────────────────────
    # Use status field primarily
    active_subs = (
        await db.execute(
            select(func.count()).select_from(Subscription).where(Subscription.status == SubscriptionStatus.active)
        )
    ).scalar_one()
    trial_subs = (
        await db.execute(
            select(func.count()).select_from(Subscription).where(Subscription.status == SubscriptionStatus.trial)
        )
    ).scalar_one()
    expired_subs = (
        await db.execute(
            select(func.count()).select_from(Subscription).where(Subscription.status == SubscriptionStatus.expired)
        )
    ).scalar_one()

    # ── Revenue ──────────────────────────────────────────────────────────────
    revenue_today = (
        await db.execute(
            select(func.coalesce(func.sum(Payment.amount_usd), 0))
            .select_from(Payment)
            .where(Payment.status == PaymentStatus.succeeded, Payment.created_at >= day_start)
        )
    ).scalar_one()
    revenue_7d = (
        await db.execute(
            select(func.coalesce(func.sum(Payment.amount_usd), 0))
            .select_from(Payment)
            .where(Payment.status == PaymentStatus.succeeded, Payment.created_at >= last_7)
        )
    ).scalar_one()
    revenue_month = (
        await db.execute(
            select(func.coalesce(func.sum(Payment.amount_usd), 0))
            .select_from(Payment)
            .where(Payment.status == PaymentStatus.succeeded, Payment.created_at >= last_30)
        )
    ).scalar_one()

    # ── Failures (last 24h) from SystemEvent ─────────────────────────────────
    paystack_fail_24h = (
        await db.execute(
            select(func.count()).select_from(SystemEvent).where(
                SystemEvent.type == SystemEventType.payment,
                SystemEvent.name == "paystack.verify.failed",
                SystemEvent.created_at >= last_24h,
            )
        )
    ).scalar_one()
    email_fail_24h = (
        await db.execute(
            select(func.count()).select_from(SystemEvent).where(
                SystemEvent.type == SystemEventType.email,
                SystemEvent.level == "error",
                SystemEvent.created_at >= last_24h,
            )
        )
    ).scalar_one()

    # ── Subscription health timeseries (active vs expired) last 30 days ──────
    # For each day, count subs considered active if period_end >= day and status active/trial
    # and expired if period_end < day OR status expired.
    # Postgres generate_series keeps this simple.
    # NOTE: avoid `:param::timestamptz` because SQLAlchemy's param parser can fail with asyncpg.
    series_sql = text(
        """
        WITH days AS (
          SELECT generate_series(CAST(:start AS timestamptz), CAST(:end AS timestamptz), interval '1 day') AS day
        )
        SELECT
          day,
          (SELECT count(*) FROM subscriptions s
             WHERE s.current_period_end IS NOT NULL
               AND s.current_period_end >= day
               AND s.status IN ('active','trial')
          ) AS active_count,
          (SELECT count(*) FROM subscriptions s
             WHERE (s.current_period_end IS NULL OR s.current_period_end < day OR s.status = 'expired')
          ) AS expired_count
        FROM days
        ORDER BY day ASC
        """
    )
    rows = (await db.execute(series_sql, {"start": last_30, "end": now})).all()
    sub_series = [
        {
            "day": (r[0].date().isoformat() if hasattr(r[0], "date") else str(r[0])),
            "active": int(r[1] or 0),
            "expired": int(r[2] or 0),
        }
        for r in rows
    ]

    # ── Upcoming expiries ────────────────────────────────────────────────────
    upcoming = {}
    for days in (1, 3, 7):
        cutoff = now + timedelta(days=days)
        res = await db.execute(
            select(User.email, Subscription.current_period_end, Subscription.status)
            .join(Subscription, Subscription.user_id == User.id)
            .where(
                Subscription.current_period_end != None,
                Subscription.current_period_end <= cutoff,
                Subscription.current_period_end >= now,
            )
            .order_by(Subscription.current_period_end.asc())
            .limit(20)
        )
        upcoming[str(days)] = [
            {
                "email": r[0],
                "expires_at": r[1].isoformat().replace("+00:00", "Z") if r[1] else None,
                "status": (r[2].value if hasattr(r[2], "value") else str(r[2])),
            }
            for r in res.all()
        ]

    # ── Renewal conversions (basic) ──────────────────────────────────────────
    # Count successful payments tagged kind=renewal in the Paystack metadata (recorded in description)
    renewals_30d = (
        await db.execute(
            select(func.count()).select_from(Payment).where(
                Payment.status == PaymentStatus.succeeded,
                Payment.created_at >= last_30,
                Payment.description.ilike("%renewal%"),
            )
        )
    ).scalar_one()

    # ── Payments (latest 20) ────────────────────────────────────────────────
    payments_res = await db.execute(
        select(
            Payment.created_at,
            Payment.amount_usd,
            Payment.currency,
            Payment.status,
            Payment.description,
            Payment.paystack_reference,
            User.email,
        )
        .select_from(Payment)
        .outerjoin(User, User.id == Payment.user_id)
        .order_by(Payment.created_at.desc())
        .limit(20)
    )
    recent_payments = [
        {
            "created_at": (r[0].isoformat().replace("+00:00", "Z") if r[0] else None),
            "amount_usd": float(r[1]) if r[1] is not None else 0.0,
            "currency": r[2],
            "status": (r[3].value if hasattr(r[3], "value") else str(r[3])),
            "description": r[4],
            "paystack_reference": r[5],
            "user_email": r[6],
        }
        for r in payments_res.all()
    ]

    verify_calls_24h = (
        await db.execute(
            select(func.count()).select_from(SystemEvent).where(
                SystemEvent.type == SystemEventType.payment,
                SystemEvent.created_at >= last_24h,
                SystemEvent.name.in_(
                    ["paystack.verify.failed", "payment.idempotent.hit", "payment.idempotent.conflict"]
                ),
            )
        )
    ).scalar_one()
    idempotent_hits_24h = (
        await db.execute(
            select(func.count()).select_from(SystemEvent).where(
                SystemEvent.name == "payment.idempotent.hit",
                SystemEvent.created_at >= last_24h,
            )
        )
    ).scalar_one()

    # ── Realtime / websocket ────────────────────────────────────────────────
    try:
        connected_users = len(getattr(ws_manager, "_by_user", {}) or {})
        connected_clients = sum(len(v) for v in (getattr(ws_manager, "_by_user", {}) or {}).values())
    except Exception:
        connected_users = 0
        connected_clients = 0

    # Note: we don't persist events per-minute; return last 10m based on SystemEvent we record in code paths.
    subscription_events_10m = (
        await db.execute(
            select(func.count()).select_from(SystemEvent).where(
                SystemEvent.name == "subscription.updated",
                SystemEvent.created_at >= last_10m,
            )
        )
    ).scalar_one()

    redis_ok = bool(ws_redis)

    # ── Devices ─────────────────────────────────────────────────────────────
    bound_devices = (await db.execute(select(func.count()).select_from(DeviceBinding))).scalar_one()
    device_conflicts_24h = (
        await db.execute(
            select(func.count()).select_from(SystemEvent).where(
                SystemEvent.name == "device.bind.conflict",
                SystemEvent.created_at >= last_24h,
            )
        )
    ).scalar_one()
    active_devices_24h = (
        await db.execute(
            select(func.count()).select_from(DeviceBinding).where(DeviceBinding.last_seen_at >= last_24h)
        )
    ).scalar_one()

    # ── Email ───────────────────────────────────────────────────────────────
    receipts_failed_24h = (
        await db.execute(
            select(func.count()).select_from(SystemEvent).where(
                SystemEvent.name == "email.receipt.failed",
                SystemEvent.created_at >= last_24h,
            )
        )
    ).scalar_one()
    reset_failed_24h = (
        await db.execute(
            select(func.count()).select_from(SystemEvent).where(
                SystemEvent.name == "email.password_reset.failed",
                SystemEvent.created_at >= last_24h,
            )
        )
    ).scalar_one()

    # ── Admin activity feed ────────────────────────────────────────────────
    audit_res = await db.execute(
        select(AuditLog.created_at, AuditLog.action, AuditLog.target_type, AuditLog.target_id, AuditLog.ip_address)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    audit_feed = [
        {
            "created_at": (r[0].isoformat().replace("+00:00", "Z") if r[0] else None),
            "action": r[1],
            "target_type": r[2],
            "target_id": r[3],
            "ip": r[4],
        }
        for r in audit_res.all()
    ]

    # ── System status ───────────────────────────────────────────────────────
    db_ok = True
    try:
        await db.execute(select(1))
    except Exception:
        db_ok = False

    return {
        "timestamp": now.isoformat().replace("+00:00", "Z"),
        "env": settings.APP_ENV,
        "kpis": {
            "users_total": int(total_users),
            "users_new_today": int(new_users_today),
            "users_verified_pct": round(verified_pct, 2),
            "subs_active": int(active_subs),
            "subs_trial": int(trial_subs),
            "subs_expired": int(expired_subs),
            "revenue_today_usd": float(revenue_today),
            "revenue_7d_usd": float(revenue_7d),
            "revenue_30d_usd": float(revenue_month),
            "failures_paystack_24h": int(paystack_fail_24h),
            "failures_email_24h": int(email_fail_24h),
        },
        "subscription_health": {
            "series_30d": sub_series,
            "upcoming_expiries": upcoming,
            "renewals_30d": int(renewals_30d),
        },
        "payments": {
            "recent": recent_payments,
            "verify_calls_24h": int(verify_calls_24h),
            "idempotent_hits_24h": int(idempotent_hits_24h),
        },
        "realtime": {
            "connected_users": int(connected_users),
            "connected_clients": int(connected_clients),
            "subscription_events_10m": int(subscription_events_10m),
            "redis_ok": bool(redis_ok),
        },
        "devices": {
            "bound_count": int(bound_devices),
            "conflicts_24h": int(device_conflicts_24h),
            "active_24h": int(active_devices_24h),
        },
        "email": {
            "receipt_fail_24h": int(receipts_failed_24h),
            "password_reset_fail_24h": int(reset_failed_24h),
            "total_fail_24h": int(email_fail_24h),
        },
        "admin_activity": {
            "audit_feed": audit_feed,
        },
        "system": {
            "api_health": "ok",
            "db_ok": db_ok,
            "redis_ok": bool(redis_ok),
        },
    }

