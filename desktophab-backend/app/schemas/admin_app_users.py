from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AppUserOut(BaseModel):
    id: str
    email: str
    name: str | None = None
    is_active: bool
    is_email_verified: bool
    created_at: datetime | None = None
    last_login_at: datetime | None = None


class AppUserListResponse(BaseModel):
    total: int
    items: list[AppUserOut]

