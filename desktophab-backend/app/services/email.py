from __future__ import annotations

import httpx
from loguru import logger

from app.core.config import settings


LOGO_URL = f"{settings.SITE_URL.rstrip('/')}/deskhablogo.png"


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
        "subject": "Verify your Deskhab account",
        "htmlContent": f"""
        <html>
          <body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellspacing="0" cellpadding="0" style="background:#020617;border-radius:24px;border:1px solid #1f2937;padding:32px;">
                    <tr>
                      <td align="center" style="padding-bottom:24px;">
                        <img
                          src="{LOGO_URL}"
                          alt="Deskhab"
                          width="240"
                          style="display:block;border:0;outline:none;text-decoration:none;max-width:240px;height:auto;"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#e5e7eb;font-size:16px;font-weight:600;padding-bottom:8px;">
                        Hi {display_name},
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;line-height:1.6;padding-bottom:16px;">
                        Thanks for creating a Deskhab account. Use the verification code below to confirm your email address.
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
                        Sent securely from Deskhab • Do not reply to this automated message.
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
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:0;margin:0;">
              <tr>
                <td align="center" style="padding:0;margin:0;">
                  <table width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:0;margin:0;">
                    <tr>
                      <td align="center" style="padding:0;">
                        <table width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:100%;background:#020617;border-radius:24px;border:1px solid #1f2937;padding:20px;">
                    <tr>
                      <td align="center" style="padding-bottom:14px;">
                        <img
                          src="{LOGO_URL}"
                          alt="Deskhab"
                          width="240"
                          style="display:block;border:0;outline:none;text-decoration:none;max-width:240px;height:auto;"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#f9fafb;font-size:18px;font-weight:800;padding-bottom:6px;letter-spacing:-0.02em;">
                        Payment received
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;line-height:1.65;padding-bottom:12px;">
                        Your <span style="color:#e5e7eb;font-weight:800;">{app_name}</span> subscription has been upgraded and is now <span style="color:#e5e7eb;font-weight:800;">Active</span>.
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#0b1220;border-radius:18px;border:1px solid rgba(16,185,129,0.45);padding:14px 16px;color:#e5e7eb;font-size:14px;line-height:1.6;">
                        <!-- Use tables (not flex) for consistent spacing across email clients -->
                        <table width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
                          <tr>
                            <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#94a3b8;">
                              Amount
                            </td>
                            <td align="right" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#f8fafc;font-weight:900;white-space:nowrap;">
                              USD&nbsp;${amount_usd:.2f}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#94a3b8;">
                              Plan
                            </td>
                            <td align="right" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-weight:800;white-space:nowrap;">
                              {app_name}&nbsp;&bull;&nbsp;Premium
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#94a3b8;">
                              Valid until
                            </td>
                            <td align="right" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-weight:700;">
                              {period_end_human}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0;color:#94a3b8;">
                              Reference
                            </td>
                            <td align="right" style="padding:8px 0;color:#e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-weight:800;">
                              {reference}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:12px;line-height:1.6;padding-top:12px;border-top:1px solid #111827;">
                        You can manage your subscription anytime in the Deskhab app.
                      </td>
                    </tr>
                        </table>
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
        "subject": "Reset your Deskhab password",
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


async def send_post_verification_login_email(email: str) -> None:
    """
    Send a post-verification login reminder email.
    NOTE: We intentionally do not send raw passwords by email.
    """
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set; skipping post-verification login email send.")
        return

    payload = {
        "to": [{"email": email}],
        "sender": {"email": settings.BREVO_SENDER_EMAIL, "name": settings.BREVO_SENDER_NAME},
        "subject": "Your Deskhab account is verified",
        "htmlContent": f"""
        <html>
          <body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 0;">
              <tr>
                <td align="center">
                  <table width="520" cellspacing="0" cellpadding="0" style="background:#020617;border-radius:24px;border:1px solid #1f2937;padding:32px;">
                    <tr>
                      <td style="color:#e5e7eb;font-size:18px;font-weight:700;padding-bottom:8px;">
                        You&apos;re verified and ready to sign in
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;font-size:14px;line-height:1.6;padding-bottom:14px;">
                        Your Deskhab email verification is complete.
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#0b1220;border-radius:14px;border:1px solid rgba(16,185,129,0.35);padding:12px 14px;color:#e5e7eb;font-size:14px;line-height:1.65;">
                        <strong>Login email:</strong> {email}<br/>
                        <strong>Password:</strong> the one you created during sign-up.
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:12px;line-height:1.6;padding-top:14px;">
                        For security, Deskhab never sends raw passwords by email.
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
            logger.error(f"Failed to send post-verification login email to {email}: {exc}")

