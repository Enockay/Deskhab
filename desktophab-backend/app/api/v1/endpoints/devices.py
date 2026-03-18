from __future__ import annotations

from datetime import timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.db.models import DeviceBinding, User, utcnow, SystemEventType
from app.schemas.device import DeviceBindRequest, DeviceBindResponse
from app.services.system_events import record_event


router = APIRouter()


@router.post("/devices/bind", response_model=DeviceBindResponse)
async def bind_device(
    payload: DeviceBindRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_device_id: str | None = Header(default=None, alias="X-Device-ID"),
) -> DeviceBindResponse:
    """
    Bind a device to the authenticated user (one active device per account).

    Rules:
    - If no binding exists: create it.
    - If same device_id: refresh last_seen.
    - If different device_id: return 409 so client can initiate transfer flow.
    """
    header_device_id = (x_device_id or "").strip()
    body_device_id = (payload.device_id or "").strip()
    if not body_device_id:
        raise HTTPException(status_code=400, detail="device_id is required")
    if header_device_id and header_device_id != body_device_id:
        raise HTTPException(status_code=400, detail="X-Device-ID header must match body.device_id")

    res = await db.execute(select(DeviceBinding).where(DeviceBinding.user_id == current_user.id))
    binding = res.scalar_one_or_none()

    now = utcnow()
    if not binding:
        binding = DeviceBinding(
            user_id=current_user.id,
            device_id=body_device_id,
            device_name=payload.device_name,
            platform=payload.platform,
            last_seen_at=now,
        )
        db.add(binding)
        await db.commit()
        return DeviceBindResponse(
            status="bound",
            user_id=str(current_user.id),
            device_id=binding.device_id,
            bound_at=now.isoformat().replace("+00:00", "Z"),
            last_seen_at=now.isoformat().replace("+00:00", "Z"),
        )

    if binding.device_id != body_device_id:
        await record_event(
            db,
            type=SystemEventType.device,
            name="device.bind.conflict",
            level="warning",
            user_id=current_user.id,
            meta={
                "requested_device_id": body_device_id,
                "bound_device_id": binding.device_id,
                "platform": payload.platform,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="device_already_bound",
        )

    # same device: refresh
    binding.last_seen_at = now
    binding.device_name = payload.device_name or binding.device_name
    binding.platform = payload.platform or binding.platform
    await db.commit()
    return DeviceBindResponse(
        status="ok",
        user_id=str(current_user.id),
        device_id=binding.device_id,
        bound_at=(binding.created_at.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z") if binding.created_at else None),
        last_seen_at=now.isoformat().replace("+00:00", "Z"),
    )

