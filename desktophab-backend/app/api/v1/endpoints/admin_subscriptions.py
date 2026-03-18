from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import String, and_, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_dependencies import get_current_admin_user
from app.core.dependencies import get_db
from app.db.models import AdminRole, AdminUser, App, AuditLog, Subscription, SubscriptionStatus, SubscriptionTier, User
from app.realtime.pubsub import publish_user_event
from app.realtime import state as realtime_state
from app.schemas.admin_subscriptions import (
    AdminSubscriptionListResponse,
    AdminSubscriptionOut,
    AdminSubscriptionUpdateRequest,
)


router = APIRouter()


def _ip(request: Request) -> str:
    return request.client.host if request.client else ""


def _require_manager(current_admin: AdminUser) -> None:
    if current_admin.role == AdminRole.support:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")


@router.get("/admin/subscriptions", response_model=AdminSubscriptionListResponse)
async def list_subscriptions(
    q: str | None = None,
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminSubscriptionListResponse:
    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))

    stmt = (
        select(Subscription, User, App)
        .join(User, Subscription.user_id == User.id)
        .join(App, Subscription.app_id == App.id)
    )

    conditions = []
    if q and q.strip():
        needle = f"%{q.strip().lower()}%"
        conditions.append(
            func.lower(User.email).like(needle)
        )
    if status_filter and status_filter.strip():
        conditions.append(Subscription.status == status_filter)
    if conditions:
        stmt = stmt.where(and_(*conditions))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(total_stmt)).scalar_one())

    res = await db.execute(
        stmt.order_by(Subscription.created_at.desc()).limit(limit).offset(offset)
    )
    rows = res.all()

    items: list[AdminSubscriptionOut] = []
    for sub, user, app in rows:
        items.append(
            AdminSubscriptionOut(
                id=str(sub.id),
                user_id=str(sub.user_id),
                app_name=app.name,
                app_slug=app.slug,
                tier=sub.tier.value if hasattr(sub.tier, "value") else str(sub.tier),
                status=sub.status.value if hasattr(sub.status, "value") else str(sub.status),
                expires_at=sub.current_period_end,
                trial_ends_at=sub.trial_ends_at,
                created_at=sub.created_at,
            )
        )

    return AdminSubscriptionListResponse(total=total, items=items)


@router.post("/admin/subscriptions/{sub_id}", response_model=AdminSubscriptionOut)
async def update_subscription(
    sub_id: str,
    payload: AdminSubscriptionUpdateRequest,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminSubscriptionOut:
    _require_manager(current_admin)
    res = await db.execute(
        select(Subscription, User, App)
        .join(User, Subscription.user_id == User.id)
        .join(App, Subscription.app_id == App.id)
        .where(cast(Subscription.id, String) == sub_id)
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    sub, user, app = row

    # Mutations
    now = datetime.now(timezone.utc)
    if payload.status:
        try:
            sub.status = SubscriptionStatus(payload.status)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid status")
        if sub.status == SubscriptionStatus.cancelled:
            sub.cancelled_at = now
    if payload.tier:
        try:
            sub.tier = SubscriptionTier(payload.tier)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid tier")
    if payload.extend_days:
        base = sub.current_period_end or now
        sub.current_period_end = base + timedelta(days=payload.extend_days)
    if payload.trial_extend_days and (sub.trial_ends_at or sub.status == SubscriptionStatus.trial):
        base = sub.trial_ends_at or now
        sub.trial_ends_at = base + timedelta(days=payload.trial_extend_days)

    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="subscription.update",
            target_type="subscription",
            target_id=str(sub.id),
            detail={
                "status": payload.status,
                "tier": payload.tier,
                "extend_days": payload.extend_days,
                "trial_extend_days": payload.trial_extend_days,
            },
            ip_address=_ip(request),
        )
    )
    await db.commit()

    # Realtime sync push
    event = {
        "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
        "tier": sub.tier.value if hasattr(sub.tier, "value") else str(sub.tier),
        "expires_at": sub.current_period_end.isoformat().replace("+00:00", "Z") if sub.current_period_end else None,
    }
    await realtime_state.manager.broadcast_user_event(str(sub.user_id), "subscription.updated", event)
    await publish_user_event(realtime_state.redis, user_id=str(sub.user_id), name="subscription.updated", data=event)

    return AdminSubscriptionOut(
        id=str(sub.id),
        user_id=str(sub.user_id),
        app_name=app.name,
        app_slug=app.slug,
        tier=event["tier"],
        status=event["status"],
        expires_at=sub.current_period_end,
        trial_ends_at=sub.trial_ends_at,
        created_at=sub.created_at,
    )


@router.post("/admin/subscriptions/{sub_id}/sync-now")
async def subscription_sync_now(
    sub_id: str,
    _: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_manager(current_admin)
    res = await db.execute(
        select(Subscription).where(cast(Subscription.id, String) == sub_id)
    )
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    event = {
        "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
        "tier": sub.tier.value if hasattr(sub.tier, "value") else str(sub.tier),
        "expires_at": sub.current_period_end.isoformat().replace("+00:00", "Z") if sub.current_period_end else None,
    }
    await realtime_state.manager.broadcast_user_event(str(sub.user_id), "subscription.updated", event)
    await publish_user_event(realtime_state.redis, user_id=str(sub.user_id), name="subscription.updated", data=event)
    return {"ok": True}

