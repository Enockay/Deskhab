from datetime import timedelta
from sqlalchemy.exc import IntegrityError

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.subscription import (
    SubscriptionStatusResponse,
    CheckoutSessionResponse,
    CreateCheckoutRequest,
    RenewCheckoutRequest,
)
from app.services.paystack import init_transaction, verify_transaction
from app.core.config import settings
from app.core.security import decode_access_token
from app.core.dependencies import get_db
from app.core.dependencies import get_current_user
from app.db.models import (
    App,
    Payment,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
    PaymentStatus,
    User,
    utcnow,
)
from app.services.email import send_receipt_email
from app.realtime.state import manager as ws_manager, redis as ws_redis
from app.realtime.pubsub import publish_user_event
from app.db.models import SystemEventType
from app.services.system_events import record_event

router = APIRouter()


async def get_or_create_app(db: AsyncSession, *, slug: str) -> App:
    """
    Ensure an App row exists so subscription verification can attach payments/subscriptions.
    """
    result = await db.execute(select(App).where(App.slug == slug))
    app = result.scalar_one_or_none()
    if app:
        return app

    # Minimal defaults for SmartCalender
    name = "SmartCalender" if slug == "smartcalender" else slug.replace("-", " ").title()
    app = App(
        slug=slug,
        name=name,
        monthly_price_usd=2.00,
        trial_days=5,
        is_active=True,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@router.get("/subscription/status", response_model=SubscriptionStatusResponse)
async def subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionStatusResponse:
    """
    Authoritative subscription status for the desktop app to refresh from.
    """
    app = await get_or_create_app(db, slug="smartcalender")
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.app_id == app.id,
        )
    )
    sub = result.scalar_one_or_none()

    if sub:
        detail = {
            "tier": sub.tier.value if hasattr(sub.tier, "value") else str(sub.tier),
            "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
            "expires_at": sub.current_period_end,
            "features": sub.features or [],
            "trial_ends_at": sub.trial_ends_at,
            "stripe_subscription_id": sub.stripe_subscription_id,
        }
        expires_at = sub.current_period_end
    else:
        detail = {
            "tier": "free",
            "status": "expired",
            "expires_at": None,
            "features": [],
            "trial_ends_at": None,
            "stripe_subscription_id": None,
        }
        expires_at = None

    # Pydantic will coerce dict into SubscriptionDetail
    return SubscriptionStatusResponse(
        user_id=str(current_user.id),
        subscription=detail,  # type: ignore[arg-type]
        subscription_expires_at=expires_at,
    )


@router.post("/subscription/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(req: CreateCheckoutRequest) -> CheckoutSessionResponse:
    """
    Initialize a Paystack transaction and return the authorization URL.
    """
    if not settings.PAYSTACK_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Paystack is not configured")

    # Amount in the smallest currency unit Paystack expects.
    # If your Paystack currency is USD, then:
    #   200 = $2.00
    amount_kobo = 200

    try:
        checkout_url, reference = await init_transaction(
            email=req.email,
            amount_kobo=amount_kobo,
            metadata={"app_slug": req.app_slug, "plan": "pro"},
            callback_url=settings.PAYSTACK_CALLBACK_URL,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return CheckoutSessionResponse(
        checkout_url=checkout_url,
        session_id=reference,
    )


@router.post("/subscription/renew", response_model=CheckoutSessionResponse)
async def renew_subscription(
    req: RenewCheckoutRequest,
    db: AsyncSession = Depends(get_db),
) -> CheckoutSessionResponse:
    """
    Renew a subscription coming from the desktop app renewal link.

    The desktop app should open a URL like:
      https://www.deskhab.com/renew-smartcalender/{user_slug}?token=...
    The frontend then sends {user_slug, token} here, and we start a Paystack transaction.
    """
    if not settings.PAYSTACK_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Paystack is not configured")

    # Validate token and resolve the real user.
    if not req.token.strip():
        raise HTTPException(status_code=400, detail="Invalid renewal token")

    try:
        payload = decode_access_token(req.token)
        user_id: str = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired renewal token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found for renewal")

    app = await get_or_create_app(db, slug=req.app_slug)

    # Renewal charges $2.
    amount_kobo = 200  # $2 renewal

    try:
        # Include kind in callback URL so frontend can reliably show "Account upgraded" (sessionStorage may be lost).
        renewal_callback_url = settings.PAYSTACK_CALLBACK_URL
        if "?" in renewal_callback_url:
            renewal_callback_url = f"{renewal_callback_url}&kind=renewal"
        else:
            renewal_callback_url = f"{renewal_callback_url}?kind=renewal"

        checkout_url, reference = await init_transaction(
            email=user.email,
            amount_kobo=amount_kobo,
            metadata={
                "app_slug": req.app_slug,
                "plan": "pro",
                "kind": "renewal",
                "user_id": str(user.id),
                "app_id": str(app.id),
            },
            callback_url=renewal_callback_url,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return CheckoutSessionResponse(
        checkout_url=checkout_url,
        session_id=reference,
    )


@router.get("/subscription/verify", response_model=CheckoutSessionResponse)
async def verify_checkout(
    reference: str,
    db: AsyncSession = Depends(get_db),
) -> CheckoutSessionResponse:
    """
    Verify a Paystack transaction by reference.
    """
    try:
        data = await verify_transaction(reference)
    except Exception as exc:
        await record_event(
            db,
            type=SystemEventType.payment,
            name="paystack.verify.failed",
            level="error",
            message=str(exc),
            meta={"reference": reference},
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if data.get("status") != "success":
        raise HTTPException(status_code=400, detail="Payment not successful")

    meta = data.get("metadata") or {}
    customer = data.get("customer") or {}
    email = customer.get("email") or meta.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Missing customer email from Paystack")

    app_slug = meta.get("app_slug", "smartcalender")
    kind = meta.get("kind", "initial")

    # Load user and app
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found for payment")

    app = await get_or_create_app(db, slug=app_slug)

    # Idempotency: if we've already recorded this reference, don't create new rows or resend email.
    existing_payment_res = await db.execute(
        select(Payment).where(Payment.paystack_reference == reference)
    )
    existing_payment = existing_payment_res.scalar_one_or_none()
    if existing_payment and existing_payment.status == PaymentStatus.succeeded:
        await record_event(
            db,
            type=SystemEventType.payment,
            name="payment.idempotent.hit",
            level="info",
            user_id=user.id,
            app_id=app.id,
            meta={"reference": reference},
        )
        return CheckoutSessionResponse(checkout_url="", session_id=reference)

    # Upsert subscription
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.app_id == app.id,
        )
    )
    sub = result.scalar_one_or_none()

    now = utcnow()
    # Extend from current expiry if already active; otherwise start from now.
    base = now
    if sub and sub.current_period_end and sub.current_period_end > now:
        base = sub.current_period_end
    period_end = base + timedelta(days=30)

    if sub:
        sub.status = SubscriptionStatus.active
        sub.tier = SubscriptionTier.premium
        sub.current_period_start = now
        sub.current_period_end = period_end
    else:
        sub = Subscription(
            user_id=user.id,
            app_id=app.id,
            tier=SubscriptionTier.premium,
            status=SubscriptionStatus.active,
            features=["all_views", "tasks_board", "reminders", "advanced_reminders"],
            current_period_start=now,
            current_period_end=period_end,
        )
        db.add(sub)

    # Record payment (idempotent)
    amount_usd = 2.00
    if existing_payment:
        existing_payment.user_id = user.id
        existing_payment.app_id = app.id
        existing_payment.amount_usd = amount_usd
        existing_payment.currency = "usd"
        existing_payment.status = PaymentStatus.succeeded
        existing_payment.description = f"{app.name} subscription ({kind})"
        payment = existing_payment
    else:
        payment = Payment(
            user_id=user.id,
            app_id=app.id,
            amount_usd=amount_usd,
            currency="usd",
            status=PaymentStatus.succeeded,
            description=f"{app.name} subscription ({kind})",
            paystack_reference=reference,
        )
        db.add(payment)

    try:
        await db.commit()
    except IntegrityError:
        # Another request recorded the same paystack reference concurrently.
        await db.rollback()
        await record_event(
            db,
            type=SystemEventType.payment,
            name="payment.idempotent.conflict",
            level="warning",
            user_id=user.id,
            app_id=app.id,
            meta={"reference": reference},
        )
        return CheckoutSessionResponse(checkout_url="", session_id=reference)

    # Send email receipt (best-effort)
    try:
        await send_receipt_email(
            user.email,
            amount_usd=amount_usd,
            app_name=app.name,
            period_end_iso=period_end.isoformat(),
            reference=reference,
        )
    except Exception:
        # Log inside email service; do not fail the request.
        await record_event(
            db,
            type=SystemEventType.email,
            name="email.receipt.failed",
            level="error",
            user_id=user.id,
            app_id=app.id,
            meta={"reference": reference, "email": user.email},
        )
        pass

    # Realtime push (signal only; desktop should refetch /subscription/status)
    event_data = {
        "status": "active",
        "tier": "premium",
        "expires_at": period_end.isoformat().replace("+00:00", "Z"),
    }
    await ws_manager.broadcast_user_event(str(user.id), "subscription.updated", event_data)
    await publish_user_event(ws_redis, user_id=str(user.id), name="subscription.updated", data=event_data)

    return CheckoutSessionResponse(
        checkout_url="",
        session_id=reference,
    )


