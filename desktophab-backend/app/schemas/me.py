from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel

from app.schemas.auth import OrganizationOut, SubscriptionOut


class MeResponse(BaseModel):
    user_id: str
    email: str
    name: str
    timezone: str = "UTC"
    language: str = "en"
    avatar_url: str | None = None
    organization: OrganizationOut | None = None
    role: str = "user"
    subscription: SubscriptionOut
    subscription_expires_at: datetime | None = None
    server_timestamp: datetime

