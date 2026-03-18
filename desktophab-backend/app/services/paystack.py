from __future__ import annotations

import httpx
from loguru import logger

from app.core.config import settings


BASE_URL = "https://api.paystack.co"


async def init_transaction(
    *,
    email: str,
    amount_kobo: int,
    metadata: dict | None = None,
    callback_url: str | None = None,
) -> tuple[str, str]:
    """
    Initialize a Paystack transaction.

    Returns (authorization_url, reference).
    """
    if not settings.PAYSTACK_SECRET_KEY:
        raise RuntimeError("PAYSTACK_SECRET_KEY is not configured")

    payload = {
        "email": email,
        "amount": amount_kobo,
        "callback_url": callback_url or settings.PAYSTACK_CALLBACK_URL,
        "metadata": metadata or {},
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{BASE_URL}/transaction/initialize",
            json=payload,
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
        )
        data = resp.json()

    if not data.get("status"):
        message = data.get("message", "Paystack initialization failed")
        logger.error(f"Paystack init failed: {message}")
        raise RuntimeError(message)

    auth_url = data["data"]["authorization_url"]
    reference = data["data"]["reference"]
    return auth_url, reference


async def verify_transaction(reference: str) -> dict:
    """
    Verify a Paystack transaction by reference.
    """
    if not settings.PAYSTACK_SECRET_KEY:
        raise RuntimeError("PAYSTACK_SECRET_KEY is not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BASE_URL}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
        )
        data = resp.json()

    if not data.get("status"):
        logger.error(f"Paystack verify failed: {data.get('message')}")
        raise RuntimeError(data.get("message", "Paystack verification failed"))

    return data["data"]

