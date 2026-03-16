from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password, get_password_hash, create_access_token
from app.db import models


class AuthService:
  async def authenticate(self, db: AsyncSession, email: str, password: str) -> models.User | None:
    # TODO: real query
    return None

  async def create_user(self, db: AsyncSession, email: str, password: str) -> models.User:
    user = models.User(email=email, hashed_password=get_password_hash(password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

  def build_tokens(self, user_id: int) -> tuple[str, str]:
    access = create_access_token(str(user_id))
    refresh = create_access_token(str(user_id))
    return access, refresh


auth_service = AuthService()

