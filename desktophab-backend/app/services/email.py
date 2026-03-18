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

    # Human-friendly date
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(period_end_iso.replace("Z", "+00:00"))
        period_end_human = dt.strftime("%b %d, %Y at %I:%M %p %Z").replace(" 0", " ")
        if not period_end_human.strip():
            period_end_human = period_end_iso
    except Exception:
        period_end_human = period_end_iso

    payload = {
        "to": [{"email": email}],
        "sender": {
            "email": settings.BREVO_SENDER_EMAIL,
            "name": settings.BREVO_SENDER_NAME,
        },
        "subject": f"Payment received — {app_name} subscription",
        "htmlContent": f"""
        <html>
          <body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 0;">
              <tr>
                <td align="center">
                  <table width="520" cellspacing="0" cellpadding="0" style="background:#020617;border-radius:24px;border:1px solid #1f2937;padding:36px;">
                    <tr>
                      <td align="center" style="padding-bottom:24px;">
                        <table cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center" style="width:40px;height:40px;border-radius:16px;background:#10b981;">
                              <span style="display:inline-block;width:20px;height:20px;background:#020617;border-radius:8px;"></span>
                            </td>
                            <td style="width:12px;"></td>
                            <td style="font-size:20px;font-weight:800;color:#f9fafb;letter-spacing:-0.02em;">
                              Desk<span style="color:#6ee7b7;">Hab</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#f9fafb;font-size:18px;font-weight:800;padding-bottom:6px;letter-spacing:-0.02em;">
                        Payment received
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;line-height:1.65;padding-bottom:18px;">
                        Your <span style="color:#e5e7eb;font-weight:700;">{app_name}</span> subscription is active.
                        Keep building — we&apos;ve got you covered.
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#0b1220;border-radius:18px;border:1px solid rgba(16,185,129,0.45);padding:18px 20px;color:#e5e7eb;font-size:14px;line-height:1.6;">
                        <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <span style="color:#94a3b8;">Amount</span>
                          <span style="color:#f8fafc;font-weight:800;">${amount_usd:.2f} USD</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <span style="color:#94a3b8;">Product</span>
                          <span style="color:#e5e7eb;font-weight:700;">{app_name}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <span style="color:#94a3b8;">Next renewal</span>
                          <span style="color:#e5e7eb;font-weight:700;">{period_end_human}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;">
                          <span style="color:#94a3b8;">Reference</span>
                          <span style="color:#e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-weight:700;">
                            {reference}
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:12px;line-height:1.6;padding-top:18px;border-top:1px solid #111827;">
                        Manage your subscription anytime in the DesktopHab app.
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


async def send_password_reset_email(email: str, *, reset_url: str) -> None:
    """
    Send a password reset link via Brevo.
    """
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set; skipping password reset email send.")
        return

    payload = {
        "to": [{"email": email}],
        "sender": {"email": settings.BREVO_SENDER_EMAIL, "name": settings.BREVO_SENDER_NAME},
        "subject": "Reset your DesktopHab password",
        "htmlContent": f"""
        <html>
          <body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellspacing="0" cellpadding="0" style="background:#020617;border-radius:24px;border:1px solid #1f2937;padding:32px;">
                    <tr>
                      <td style="color:#e5e7eb;font-size:16px;font-weight:700;padding-bottom:8px;">
                        Password reset
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;line-height:1.6;padding-bottom:18px;">
                        Click the button below to set a new password. This link expires soon.
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom:18px;">
                        <a href="{reset_url}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#10b981;color:#020617;text-decoration:none;font-weight:700;font-size:14px;">
                          Reset password
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:12px;line-height:1.6;">
                        If you didn&apos;t request this, you can ignore this email.
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
        except Exception as exc:  # pragma: no cover
            logger.error(f"Failed to send password reset email to {email}: {exc}")

