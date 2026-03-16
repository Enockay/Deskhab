from datetime import datetime
from pydantic import BaseModel


class SubscriptionStatusResponse(BaseModel):
    """Response for GET /v1/subscription/status"""
    user_id: str
    subscription: "SubscriptionDetail"
    subscription_expires_at: datetime | None = None


class SubscriptionDetail(BaseModel):
    tier: str
    status: str
    expires_at: datetime | None = None
    features: list[str] = []
    trial_ends_at: datetime | None = None
    stripe_subscription_id: str | None = None


class CreateCheckoutRequest(BaseModel):
    app_slug: str = "smartcalender"


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


class RenewalURLResponse(BaseModel):
    """Returned when the desktop app asks for the renewal URL to open in the browser."""
    renewal_url: str


SubscriptionStatusResponse.model_rebuild()