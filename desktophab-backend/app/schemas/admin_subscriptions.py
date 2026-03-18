from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdminSubscriptionOut(BaseModel):
  id: str
  user_id: str
  app_name: str
  app_slug: str
  tier: str
  status: str
  expires_at: datetime | None = None
  trial_ends_at: datetime | None = None
  created_at: datetime | None = None


class AdminSubscriptionListResponse(BaseModel):
  total: int
  items: list[AdminSubscriptionOut]


class AdminSubscriptionUpdateRequest(BaseModel):
  status: str | None = None
  tier: str | None = None
  extend_days: int | None = None
  trial_extend_days: int | None = None
