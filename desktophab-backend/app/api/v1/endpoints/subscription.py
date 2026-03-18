from datetime import timedelta

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
        monthly_price_usd=1.00,
        trial_days=5,
        is_active=True,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@router.get("/subscription/status", response_model=SubscriptionStatusResponse)
async def subscription_status() -> SubscriptionStatusResponse:
    # TODO: implement real lookup based on authenticated user
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/subscription/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(req: CreateCheckoutRequest) -> CheckoutSessionResponse:
    """
    Initialize a Paystack transaction and return the authorization URL.
    """
    if not settings.PAYSTACK_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Paystack is not configured")

    # amount in kobo (example: ₦100 → 100 * 100)
    amount_kobo = 100  # TODO: compute from plan/app_slug

    try:
        checkout_url, reference = await init_transaction(
            email=req.email,
            amount_kobo=amount_kobo,
            metadata={"app_slug": req.app_slug, "plan": "pro"},
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

    amount_kobo = 100  # TODO: compute from plan / app configuration

    try:
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
    period_end = now + timedelta(days=30)

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

    # Record payment
    amount_usd = 1.00  # TODO: derive from Paystack amount / FX rate
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

    await db.commit()

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
        pass

    return CheckoutSessionResponse(
        checkout_url="",
        session_id=reference,
    )


