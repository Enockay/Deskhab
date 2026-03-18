from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError
from loguru import logger
from sqlalchemy import select

from app.core.security import decode_access_token
from app.realtime.state import manager as ws_manager
from app.db.session import AsyncSessionLocal
from app.db.models import DeviceBinding, utcnow


router = APIRouter()


def _token_from_ws(ws: WebSocket) -> str | None:
    auth = ws.headers.get("authorization") or ws.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return ws.query_params.get("token")


@router.websocket("/ws")
async def websocket_gateway(ws: WebSocket):
    """
    WebSocket gateway:
      - Authenticate with Authorization: Bearer <token> (preferred) or ?token=<token>
      - Client subscribes with {"type":"subscribe","topic":"user","user_id":"..."}
      - Server emits {"type":"event","name":"subscription.updated",...}
    """
    token = _token_from_ws(ws)
    if not token:
        await ws.close(code=4401)
        return

    try:
        payload = decode_access_token(token)
        authed_user_id: str | None = payload.get("sub")
        if not authed_user_id:
            raise ValueError("missing sub")
    except (JWTError, ValueError, Exception):
        await ws.close(code=4401)
        return

    # Device binding enforcement (optional for now, but enabled when device_id is provided)
    device_id = (ws.query_params.get("device_id") or "").strip()
    if device_id:
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(DeviceBinding).where(DeviceBinding.user_id == authed_user_id)
            )
            binding = res.scalar_one_or_none()
            if not binding or binding.device_id != device_id:
                await ws.close(code=4403)
                return
            # refresh last_seen
            binding.last_seen_at = utcnow()
            await db.commit()

    subscribed_user_id: str | None = None

    try:
        # Require explicit subscribe message (so we can validate requested user_id)
        await ws.accept()
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            mtype = msg.get("type")
            if mtype == "pong":
                continue
            if mtype == "ping":
                await ws.send_text(json.dumps({"type": "pong", "ts": _ts()}))
                continue

            if mtype == "subscribe" and msg.get("topic") == "user":
                requested = str(msg.get("user_id") or "")
                if requested != authed_user_id:
                    await ws.send_text(json.dumps({"type": "error", "message": "user_id mismatch"}))
                    await ws.close(code=4403)
                    return

                subscribed_user_id = requested
                # move connection into manager
                await ws_manager.connect(subscribed_user_id, ws)
                await ws.send_text(json.dumps({"type": "subscribed", "topic": "user", "user_id": subscribed_user_id, "ts": _ts()}))
                break

        # Keepalive loop
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            mtype = msg.get("type")
            if mtype == "pong":
                continue
            if mtype == "ping":
                await ws.send_text(json.dumps({"type": "pong", "ts": _ts()}))
                continue

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning(f"ws error user_id={authed_user_id}: {exc}")
    finally:
        if subscribed_user_id:
            await ws_manager.disconnect(subscribed_user_id, ws)


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

