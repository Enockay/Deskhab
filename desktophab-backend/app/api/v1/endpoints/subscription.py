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

    result = await db.execute(select(App).where(App.slug == req.app_slug))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

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

    result = await db.execute(select(App).where(App.slug == app_slug))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

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


