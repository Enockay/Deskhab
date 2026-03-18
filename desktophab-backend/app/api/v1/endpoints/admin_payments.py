from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_dependencies import get_current_admin_user
from app.core.dependencies import get_db
from app.db.models import AdminRole, AdminUser, App, AuditLog, Payment, PaymentStatus, User
from app.schemas.admin_payments import AdminPaymentListResponse, AdminPaymentOut
from app.services.email import send_receipt_email


router = APIRouter()


def _ip(request: Request) -> str:
    return request.client.host if request.client else ""


def _require_manager(current_admin: AdminUser) -> None:
    if current_admin.role == AdminRole.support:
        raise HTTPException(status_code=403, detail="Insufficient role")


@router.get("/admin/payments", response_model=AdminPaymentListResponse)
async def list_payments(
    q: str | None = None,
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminPaymentListResponse:
    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))

    stmt = (
        select(Payment, User, App)
        .outerjoin(User, Payment.user_id == User.id)
        .outerjoin(App, Payment.app_id == App.id)
    )

    conditions = []
    if q and q.strip():
        needle = f"%{q.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(User.email).like(needle),
                func.lower(Payment.paystack_reference).like(needle),
            )
        )
    if status_filter and status_filter.strip():
        conditions.append(Payment.status == status_filter)
    if conditions:
        stmt = stmt.where(and_(*conditions))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(total_stmt)).scalar_one())

    res = await db.execute(
        stmt.order_by(Payment.created_at.desc()).limit(limit).offset(offset)
    )
    rows = res.all()

    items: list[AdminPaymentOut] = []
    for pay, user, app in rows:
        items.append(
            AdminPaymentOut(
                id=str(pay.id),
                user_email=user.email if user else None,
                app_name=app.name if app else None,
                amount_usd=float(pay.amount_usd),
                currency=pay.currency,
                status=pay.status.value if hasattr(pay.status, "value") else str(pay.status),
                reference=pay.paystack_reference or pay.stripe_payment_intent_id,
                created_at=pay.created_at,
            )
        )
    return AdminPaymentListResponse(total=total, items=items)


@router.get("/admin/payments/paystack/{reference}", response_model=AdminPaymentOut)
async def get_payment_by_reference(
    reference: str,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminPaymentOut:
    res = await db.execute(
        select(Payment, User, App)
        .outerjoin(User, Payment.user_id == User.id)
        .outerjoin(App, Payment.app_id == App.id)
        .where(Payment.paystack_reference == reference)
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found")
    pay, user, app = row
    return AdminPaymentOut(
        id=str(pay.id),
        user_email=user.email if user else None,
        app_name=app.name if app else None,
        amount_usd=float(pay.amount_usd),
        currency=pay.currency,
        status=pay.status.value if hasattr(pay.status, "value") else str(pay.status),
        reference=pay.paystack_reference or pay.stripe_payment_intent_id,
        created_at=pay.created_at,
    )


@router.post("/admin/payments/{payment_id}/resend-receipt")
async def resend_receipt(
    payment_id: str,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_manager(current_admin)
    res = await db.execute(
        select(Payment, User, App)
        .outerjoin(User, Payment.user_id == User.id)
        .outerjoin(App, Payment.app_id == App.id)
        .where(cast(Payment.id, String) == payment_id)
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found")
    pay, user, app = row
    if not user:
        raise HTTPException(status_code=400, detail="Payment has no user attached")

    if pay.status != PaymentStatus.succeeded:
        raise HTTPException(status_code=400, detail="Only successful payments can receive receipts")

    await send_receipt_email(
        user.email,
        amount_usd=float(pay.amount_usd),
        app_name=app.name if app else "SmartCalender",
        period_end_iso=(pay.created_at or datetime.utcnow()).isoformat(),
        reference=pay.paystack_reference or pay.stripe_payment_intent_id or str(pay.id),
    )

    db.add(
        AuditLog(
            admin_id=current_admin.id,
            action="payment.resend_receipt",
            target_type="payment",
            target_id=str(pay.id),
            detail={"reference": pay.paystack_reference, "user_email": user.email},
            ip_address=_ip(request),
        )
    )
    await db.commit()
    return {"ok": True}

