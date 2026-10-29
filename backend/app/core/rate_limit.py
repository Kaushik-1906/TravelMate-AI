import time
from collections import defaultdict, deque
from typing import Callable, Deque, Dict

from fastapi import Request

from app.config import settings
from app.core.exceptions import TravelMateException

# Per-process, in-memory sliding-window limiter. This is intentionally simple:
# it protects a single instance from accidental repeated AI calls. For a
# multi-instance deployment, move this to Redis or an API gateway.
_BUCKETS: Dict[str, Deque[float]] = defaultdict(deque)


def rate_limit(scope: str) -> Callable:
    async def dependency(request: Request) -> None:
        limit = max(1, settings.RATE_LIMIT_REQUESTS)
        window = max(1, settings.RATE_LIMIT_WINDOW_SECONDS)
        client_ip = request.client.host if request.client else "unknown"
        key = f"{scope}:{client_ip}"
        now = time.monotonic()
        bucket = _BUCKETS[key]

        while bucket and (now - bucket[0]) >= window:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(window - (now - bucket[0])))
            raise TravelMateException(
                status_code=429,
                detail=(
                    "Too many AI generation requests. "
                    f"Please wait about {retry_after} seconds and try again."
                ),
            )

        bucket.append(now)

    return dependency


def reset_rate_limits() -> None:
    """Test helper."""
    _BUCKETS.clear()
