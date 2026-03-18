from __future__ import annotations

from pydantic import BaseModel


class AdminAppOut(BaseModel):
  id: str
  name: str
  slug: str
  monthly_price_usd: float
  trial_days: int
  is_active: bool


class AdminAppUpdateRequest(BaseModel):
  name: str | None = None
  monthly_price_usd: float | None = None
  trial_days: int | None = None
  is_active: bool | None = None

