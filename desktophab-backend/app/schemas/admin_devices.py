from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdminDeviceBindingOut(BaseModel):
  id: str
  user_id: str
  email: str | None = None
  device_id: str
  device_name: str | None = None
  platform: str | None = None
  last_seen_at: datetime | None = None
  created_at: datetime | None = None


class AdminDeviceListResponse(BaseModel):
  total: int
  items: list[AdminDeviceBindingOut]

