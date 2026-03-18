from pydantic import BaseModel, EmailStr, Field


class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=256)
    name: str | None = Field(default=None, max_length=128)
    role: str = Field(default="manager")  # "support" | "manager" | "admin"


class AdminUserOut(BaseModel):
    id: int
    email: EmailStr
    name: str | None = None
    role: str
    is_active: bool

