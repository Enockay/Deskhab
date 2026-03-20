from __future__ import annotations

from pydantic import BaseModel, Field


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


class AdminAppCreateRequest(BaseModel):
  name: str = Field(min_length=1, max_length=128)
  slug: str = Field(min_length=2, max_length=64)
  monthly_price_usd: float = 2.0
  trial_days: int = Field(default=5, ge=1, le=365)
  is_active: bool = True

