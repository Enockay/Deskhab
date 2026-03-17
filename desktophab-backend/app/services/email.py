from __future__ import annotations

import httpx
from loguru import logger

from app.core.config import settings


async def send_verification_email(email: str, code: str, name: str | None = None) -> None:
    """
    Send a simple verification email with a 6‑digit code via Brevo.
    """
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set; skipping email send.")
        return

    display_name = name or "there"

    payload = {
        "to": [{"email": email}],
        "sender": {
            "email": settings.BREVO_SENDER_EMAIL,
            "name": settings.BREVO_SENDER_NAME,
        },
        "subject": "Verify your DesktopHab account",
        "htmlContent": f"""
        <html>
          <body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellspacing="0" cellpadding="0" style="background:#020617;border-radius:24px;border:1px solid #1f2937;padding:32px;">
                    <tr>
                      <td align="center" style="padding-bottom:24px;">
                        <table cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center" style="width:40px;height:40px;border-radius:16px;background:#10b981;">
                              <span style="display:inline-block;width:20px;height:20px;background:#020617;border-radius:8px;"></span>
                            </td>
                            <td style="width:12px;"></td>
                            <td style="font-size:20px;font-weight:700;color:#f9fafb;">
                              Desk<span style="color:#6ee7b7;">Hab</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#e5e7eb;font-size:16px;font-weight:600;padding-bottom:8px;">
                        Hi {display_name},
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;line-height:1.6;padding-bottom:16px;">
                        Thanks for creating a DesktopHab account. Use the verification code below to confirm your email address.
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding:16px 0 24px 0;">
                        <div style="display:inline-block;padding:12px 32px;border-radius:999px;background:#111827;border:1px solid #10b981;">
                          <span style="font-size:26px;letter-spacing:0.24em;font-weight:700;color:#f9fafb;">
                            {code}
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:12px;line-height:1.6;padding-bottom:16px;">
                        For your security, this code will expire soon. If you didn&apos;t request this, you can safely ignore this email.
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#4b5563;font-size:11px;padding-top:8px;border-top:1px solid #111827;">
                        Sent securely from DesktopHab • Do not reply to this automated message.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                json=payload,
                headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"},
            )
            resp.raise_for_status()
        except Exception as exc:  # pragma: no cover - best‑effort logging
            logger.error(f"Failed to send Brevo email to {email}: {exc}")


async def send_receipt_email(
    email: str,
    *,
    amount_usd: float,
    app_name: str,
    period_end_iso: str,
    reference: str,
) -> None:
    """
    Send a simple subscription receipt email after a successful payment.
    """
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set; skipping receipt email send.")
        return

    payload = {
        "to": [{"email": email}],
        "sender": {
            "email": settings.BREVO_SENDER_EMAIL,
            "name": settings.BREVO_SENDER_NAME,
        },
        "subject": f"Your {app_name} subscription receipt",
        "htmlContent": f"""
        <html>
          <body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellspacing="0" cellpadding="0" style="background:#020617;border-radius:24px;border:1px solid #1f2937;padding:32px;">
                    <tr>
                      <td align="center" style="padding-bottom:24px;">
                        <span style="font-size:20px;font-weight:700;color:#f9fafb;">
                          Desk<span style="color:#6ee7b7;">Hab</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#e5e7eb;font-size:16px;font-weight:600;padding-bottom:8px;">
                        Thanks for renewing {app_name} ✔
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;line-height:1.6;padding-bottom:16px;">
                        We&apos;ve received your payment and your subscription is now active.
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#020617;border-radius:16px;border:1px solid #10b981;padding:16px 20px;color:#e5e7eb;font-size:14px;line-height:1.6;">
                        <div style="margin-bottom:4px;"><strong>Amount:</strong> ${amount_usd:.2f} USD</div>
                        <div style="margin-bottom:4px;"><strong>Next renewal:</strong> {period_end_iso}</div>
                        <div style="margin-bottom:4px;"><strong>Reference:</strong> {reference}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:12px;line-height:1.6;padding-top:16px;border-top:1px solid #111827;">
                        You can manage your subscription any time from the DesktopHab app.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                json=payload,
                headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"},
            )
            resp.raise_for_status()
        except Exception as exc:  # pragma: no cover - best‑effort logging
            logger.error(f"Failed to send receipt email to {email}: {exc}")

