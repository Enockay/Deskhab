from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket
from loguru import logger


class ConnectionManager:
    """
    In-memory websocket connection manager.

    Works for a single API instance. For multi-instance fanout, publish events through Redis
    and call `broadcast_user_event()` on each instance (see `pubsub.py`).
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._by_user: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._by_user[user_id].add(ws)
        logger.info(f"ws connected user_id={user_id} clients={len(self._by_user[user_id])}")

    async def disconnect(self, user_id: str, ws: WebSocket) -> None:
        async with self._lock:
            self._by_user[user_id].discard(ws)
            if not self._by_user[user_id]:
                self._by_user.pop(user_id, None)
        logger.info(f"ws disconnected user_id={user_id}")

    async def broadcast_user_event(self, user_id: str, name: str, data: dict[str, Any]) -> None:
        """
        Best-effort broadcast to all connected sockets for the user.
        """
        payload = {
            "type": "event",
            "name": name,
            "user_id": user_id,
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "data": data,
        }
        msg = json.dumps(payload)

        async with self._lock:
            sockets = list(self._by_user.get(user_id, set()))

        if not sockets:
            return

        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)

        for ws in dead:
            await self.disconnect(user_id, ws)

