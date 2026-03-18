from __future__ import annotations

import json
from typing import Any

from loguru import logger

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover
    Redis = Any  # type: ignore[misc,assignment]


CHANNEL_PREFIX = "deskhab:realtime:user:"


def user_channel(user_id: str) -> str:
    return f"{CHANNEL_PREFIX}{user_id}"


async def publish_user_event(
    redis: Redis | None,
    *,
    user_id: str,
    name: str,
    data: dict[str, Any],
) -> None:
    """
    Publish a user-scoped event through Redis so other API instances can broadcast it.
    """
    if not redis:
        return
    payload = {"name": name, "user_id": user_id, "data": data}
    try:
        await redis.publish(user_channel(user_id), json.dumps(payload))
    except Exception as exc:  # pragma: no cover
        logger.error(f"redis publish failed user_id={user_id}: {exc}")


async def subscribe_forever(redis: Redis, pattern: str):
    """
    Async generator yielding (channel, message) for a psubscribe pattern.
    """
    pubsub = redis.pubsub()
    await pubsub.psubscribe(pattern)
    try:
        async for msg in pubsub.listen():
            if msg.get("type") not in ("pmessage", "message"):
                continue
            channel = msg.get("channel")
            data = msg.get("data")
            if isinstance(channel, bytes):
                channel = channel.decode()
            if isinstance(data, bytes):
                data = data.decode()
            yield channel, data
    finally:
        try:
            await pubsub.close()
        except Exception:
            pass

