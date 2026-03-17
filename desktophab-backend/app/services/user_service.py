from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User


class UserService:
    """
    Minimal user service used by dependencies to resolve users by ID.

    This exists primarily to support `get_current_user` and related helpers.
    Extend it later with more user-related operations as needed.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID | str) -> User | None:
        """
        Fetch a user by UUID (accepts both UUID and string).
        """
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

