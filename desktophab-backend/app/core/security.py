"""Security utilities: password hashing, JWT creation/verification, token helpers."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Passwords ────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ─── Access tokens (JWT) ──────────────────────────────────────────────────────

def create_access_token(
    subject: str,          # user UUID as string
    role: str = "user",
    extra: dict | None = None,
    expires_delta: timedelta | None = None,
) -> tuple[str, datetime]:
    """Return (encoded_jwt, expires_at_utc)."""
    expires_delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": subject,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
        **(extra or {}),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expire


def decode_access_token(token: str) -> dict:
    """Decode and validate JWT. Raises JWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def create_admin_access_token(
    admin_id: int,
    role: str = "admin",
    expires_delta: timedelta | None = None,
) -> tuple[str, datetime]:
    """Return (encoded_jwt, expires_at_utc) for admin API."""
    expires_delta = expires_delta or timedelta(minutes=settings.ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": f"admin:{admin_id}",
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "admin_access",
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expire


def decode_admin_access_token(token: str) -> dict:
    """Decode and validate admin access JWT. Raises JWTError on failure."""
    data = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if data.get("type") != "admin_access":
        raise JWTError("invalid token type")
    return data


# ─── Refresh tokens (opaque) ──────────────────────────────────────────────────

def generate_refresh_token() -> str:
    """Generate a cryptographically random 64-char hex token."""
    return secrets.token_hex(32)


def hash_token(raw: str) -> str:
    """SHA-256 hash of the raw token — what we store in the DB."""
    return hashlib.sha256(raw.encode()).hexdigest()


# ─── Renewal URL ──────────────────────────────────────────────────────────────

def build_renewal_url(user_id: str, access_token: str) -> str:
    """
    Build the browser URL the desktop app opens for subscription renewal.
    Format: https://desktophab.com/renew-smartcalender/{user_id}?token={access_token}
    """
    return f"{settings.RENEWAL_BASE_URL}/{user_id}?token={access_token}"