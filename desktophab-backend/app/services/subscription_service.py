"""Subscription service: status checks, Stripe integration, renewal handling."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import build_renewal_url
from app.db.models import Subscription, App, Payment, User

stripe.api_key = settings.STRIPE_SECRET_KEY


class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Status check ──────────────────────────────────────────────────────────

    async def get_status(self, user_id: UUID) -> Subscription | None:
        result = await self.db.execute(
            select(Subscription)
            .join(App, App.id == Subscription.app_id)
            .where(
                Subscription.user_id == user_id,
                App.slug == "smartcalender",
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            await self._sync_expiry(sub)
        return sub

    # ── Renewal URL (returned to desktop app) ─────────────────────────────────

    async def get_renewal_url(self, user: User, access_token: str) -> str:
        """
        Build and return the URL the desktop app opens in the browser.
        Pattern: https://desktophab.com/renew-smartcalender/{user_id}?token={token}
        """
        return build_renewal_url(str(user.id), access_token)

    # ── Create Stripe checkout session ────────────────────────────────────────

    async def create_checkout_session(self, user: User, app_slug: str = "smartcalender") -> dict:
        """
        Create a Stripe Checkout session for the $1/month subscription.
        Returns {checkout_url, session_id}.
        """
        app = await self._get_app(app_slug)
        if not app or not app.stripe_price_id:
            raise ValueError(f"App '{app_slug}' not found or has no Stripe price configured")

        # Create or retrieve Stripe customer
        customer_id = user.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(email=user.email, name=user.name or "")
            user.stripe_customer_id = customer.id
            await self.db.commit()
            customer_id = customer.id

        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": app.stripe_price_id, "quantity": 1}],
            success_url=f"{settings.SITE_URL}/account?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.SITE_URL}/pricing?checkout=cancelled",
            metadata={"user_id": str(user.id), "app_slug": app_slug},
            subscription_data={
                # No free trial: charge immediately and handle renewals normally.
                "trial_period_days": 0,
                "metadata": {"user_id": str(user.id), "app_slug": app_slug},
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}

    # ── Stripe webhook handler ─────────────────────────────────────────────────

    async def handle_stripe_webhook(self, payload: bytes, sig_header: str) -> None:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid Stripe signature")

        handler = {
            "customer.subscription.created": self._on_subscription_created,
            "customer.subscription.updated": self._on_subscription_updated,
            "customer.subscription.deleted": self._on_subscription_deleted,
            "invoice.payment_succeeded": self._on_payment_succeeded,
            "invoice.payment_failed": self._on_payment_failed,
        }.get(event["type"])

        if handler:
            await handler(event["data"]["object"])

    # ── Internal webhook handlers ─────────────────────────────────────────────

    async def _on_subscription_created(self, stripe_sub: dict) -> None:
        await self._upsert_subscription(stripe_sub, status="active")

    async def _on_subscription_updated(self, stripe_sub: dict) -> None:
        stripe_status = stripe_sub.get("status")
        status_map = {
            "active": "active", "trialing": "trial",
            "canceled": "cancelled", "past_due": "expired",
        }
        await self._upsert_subscription(stripe_sub, status=status_map.get(stripe_status, "expired"))

    async def _on_subscription_deleted(self, stripe_sub: dict) -> None:
        result = await self.db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub["id"]
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = "cancelled"
            sub.cancelled_at = datetime.now(timezone.utc)
            await self.db.commit()

    async def _on_payment_succeeded(self, invoice: dict) -> None:
        user_id = invoice.get("metadata", {}).get("user_id") or \
                  invoice.get("subscription_details", {}).get("metadata", {}).get("user_id")
        if not user_id:
            return
        payment = Payment(
            user_id=UUID(user_id),
            amount_usd=invoice["amount_paid"] / 100,
            currency=invoice["currency"],
            status="succeeded",
            stripe_invoice_id=invoice["id"],
            stripe_payment_intent_id=invoice.get("payment_intent"),
            description="SmartCalender subscription",
        )
        self.db.add(payment)
        await self.db.commit()

    async def _on_payment_failed(self, invoice: dict) -> None:
        # Could send email / notify user here
        pass

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _upsert_subscription(self, stripe_sub: dict, status: str) -> None:
        user_id_str = stripe_sub.get("metadata", {}).get("user_id")
        app_slug = stripe_sub.get("metadata", {}).get("app_slug", "smartcalender")
        if not user_id_str:
            return

        app = await self._get_app(app_slug)
        if not app:
            return

        result = await self.db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub["id"]
            )
        )
        sub = result.scalar_one_or_none()

        period_end = datetime.fromtimestamp(
            stripe_sub["current_period_end"], tz=timezone.utc
        )
        period_start = datetime.fromtimestamp(
            stripe_sub["current_period_start"], tz=timezone.utc
        )

        if sub:
            sub.status = status
            sub.tier = "premium"
            sub.current_period_start = period_start
            sub.current_period_end = period_end
        else:
            sub = Subscription(
                user_id=UUID(user_id_str),
                app_id=app.id,
                stripe_subscription_id=stripe_sub["id"],
                status=status,
                tier="premium",
                features=["all_views", "tasks_board", "reminders", "advanced_reminders"],
                current_period_start=period_start,
                current_period_end=period_end,
            )
            self.db.add(sub)
        await self.db.commit()

    async def _sync_expiry(self, sub: Subscription) -> None:
        """Auto-expire subscriptions whose period has passed."""
        now = datetime.now(timezone.utc)
        if sub.current_period_end and sub.current_period_end < now:
            if sub.status not in ("cancelled", "expired"):
                sub.status = "expired"
                await self.db.commit()

    async def _get_app(self, slug: str) -> App | None:
        result = await self.db.execute(select(App).where(App.slug == slug))
        return result.scalar_one_or_none()