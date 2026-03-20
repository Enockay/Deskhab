"""Pydantic schemas for auth endpoints — these match the contract the desktop app expects."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr, Field


# ─── Requests ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
    remember_me: bool = False


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class GoogleSetPasswordRequest(BaseModel):
    id_token: str = Field(min_length=20)
    password: str = Field(min_length=8)
    name: str | None = Field(default=None, max_length=128)


# ─── Sub-objects in auth response ────────────────────────────────────────────

class SubscriptionOut(BaseModel):
    tier: str
    status: str
    expires_at: datetime | None = None
    features: list[str] = []


class OrganizationOut(BaseModel):
    id: str | None = None
    name: str | None = None


# ─── Auth response (matches desktop app AuthResponse model exactly) ───────────

class AuthResponse(BaseModel):
    """
    Shape the desktop app's AuthService.login() expects.
    Field names must not change — the app does strict attribute access.
    """
    user_id: str
    email: str
    name: str
    access_token: str
    refresh_token: str | None = None
    token_expires_at: datetime

    subscription: SubscriptionOut
    subscription_expires_at: datetime | None = None   # duplicated top-level per contract

    timezone: str = "UTC"
    language: str = "en"
    avatar_url: str | None = None

    organization: OrganizationOut | None = None
    role: str = "user"

    api_version: str = "v1"
    server_timestamp: datetime


# ─── Health check ─────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "v1"
    timestamp: datetime


# ─── Error shapes (returned on 4xx/5xx) ──────────────────────────────────────

class ErrorResponse(BaseModel):
    error: str
    message: str
    detail: Any | None = None