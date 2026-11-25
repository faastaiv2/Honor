import time
from collections import defaultdict


class RateLimiter:
    """Small in-memory limiter for sign-in attempts (one server process is enough for a family board)."""

    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    def hit(self, key: str) -> bool:
        """Record an attempt. False when the key has used up its attempts for the window."""
        now = time.monotonic()
        hits = [t for t in self._hits[key] if now - t < self.window]
        allowed = len(hits) < self.limit
        if allowed:
            hits.append(now)
        self._hits[key] = hits
        return allowed


login_limiter = RateLimiter(limit=10, window_seconds=300)
