from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: str
    email: str
    name: str | None
    role: str
    is_active: bool
    timezone: str
    language: str
    avatar_url: str | None
    organization_id: str | None
    organization_name: str | None
    created_at: datetime
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    name: str | None = None
    timezone: str | None = None
    language: str | None = None
    avatar_url: str | None = None


class AdminUserOut(BaseModel):
    id: int
    email: str
    name: str | None
    is_active: bool
    is_superadmin: bool
    created_at: datetime
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"