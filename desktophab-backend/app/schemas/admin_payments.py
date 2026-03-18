from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdminPaymentOut(BaseModel):
  id: str
  user_email: str | None = None
  app_name: str | None = None
  amount_usd: float
  currency: str
  status: str
  reference: str | None = None
  created_at: datetime


class AdminPaymentListResponse(BaseModel):
  total: int
  items: list[AdminPaymentOut]

