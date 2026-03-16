from fastapi import APIRouter

from app.schemas.subscription import SubscriptionStatusResponse, CheckoutSessionResponse

router = APIRouter()


@router.get("/subscription/status", response_model=SubscriptionStatusResponse)
async def subscription_status() -> SubscriptionStatusResponse:
  # TODO: implement real lookup based on authenticated user
  return SubscriptionStatusResponse(
    active=True,
    plan="pro",
    renews_at=None,
  )


@router.post("/subscription/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session() -> CheckoutSessionResponse:
  # TODO: integrate with Stripe to create checkout session
  return CheckoutSessionResponse(
    checkout_url="https://example.com/checkout/session/demo",
  )


@router.post("/subscription/renewal-url", response_model=CheckoutSessionResponse)
async def renewal_url() -> CheckoutSessionResponse:
  # TODO: generate customer portal or renewal link
  return CheckoutSessionResponse(
    checkout_url="https://example.com/billing/portal/demo",
  )


@router.post("/subscription/webhook/stripe")
async def stripe_webhook() -> dict:
  # TODO: verify Stripe signature and handle events
  return {"received": True}

