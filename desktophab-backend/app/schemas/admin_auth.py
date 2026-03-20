from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=256)
    remember_me: bool = False

class AdminAuthResponse(BaseModel):
    admin_id: int
    email: EmailStr
    name: str = ""
    role: str
    access_token: str
    refresh_token: str
    token_expires_at: datetime
    server_timestamp: datetime


class AdminMeResponse(BaseModel):
    admin_id: int
    email: EmailStr
    name: str = ""
    role: str
    is_active: bool
    last_login_at: datetime | None = None

