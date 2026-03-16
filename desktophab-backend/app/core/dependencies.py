from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
import jwt

from app.core.config import settings
from app.db.session import get_db


reusable_oauth2 = HTTPBearer(auto_error=False)


async def get_db_session() -> AsyncSession:
  async for session in get_db():
    return session


async def get_current_user(
  credentials: HTTPAuthorizationCredentials | None = Depends(reusable_oauth2),
) -> dict:
  if credentials is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

  token = credentials.credentials
  try:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    sub = payload.get("sub")
  except jwt.PyJWTError:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

  if sub is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

  # TODO: fetch real user from DB
  return {"id": int(sub), "email": "demo@example.com"}

