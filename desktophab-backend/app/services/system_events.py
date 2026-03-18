from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SystemEvent, SystemEventType


async def record_event(
    db: AsyncSession,
    *,
    type: SystemEventType,
    name: str,
    level: str = "info",
    message: str | None = None,
    user_id=None,
    admin_id=None,
    app_id=None,
    meta: dict | None = None,
) -> None:
    """
    Best-effort system event recorder for operational metrics.
    Never raises.
    """
    try:
        db.add(
            SystemEvent(
                type=type,
                name=name,
                level=level,
                message=message,
                user_id=user_id,
                admin_id=admin_id,
                app_id=app_id,
                meta=meta or {},
            )
        )
        await db.commit()
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass

