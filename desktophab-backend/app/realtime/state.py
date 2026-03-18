from __future__ import annotations

from typing import Any

from app.realtime.manager import ConnectionManager


manager = ConnectionManager()

# Optional: set at startup if Redis is configured
redis: Any | None = None

