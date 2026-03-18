from pydantic import BaseModel, Field


class DeviceBindRequest(BaseModel):
    device_id: str = Field(..., min_length=8, max_length=128)
    device_name: str | None = Field(default=None, max_length=255)
    platform: str | None = Field(default=None, max_length=64)


class DeviceBindResponse(BaseModel):
    status: str
    user_id: str
    device_id: str
    bound_at: str | None = None
    last_seen_at: str | None = None

