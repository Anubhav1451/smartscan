import time
import threading
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status

class InMemoryRateLimiter:
    """
    Sliding-window rate limiter for sensitive write & abuse-prone endpoints.
    Tracks client timestamps by key (client IP + optional user id).
    """
    def __init__(self, limit: int = 60, window_seconds: int = 60, burst_limit: int = 15, burst_seconds: int = 3):
        self.limit = limit
        self.window_seconds = window_seconds
        self.burst_limit = burst_limit
        self.burst_seconds = burst_seconds
        self.requests: Dict[str, List[float]] = {}
        self.lock = threading.Lock()

    def check(self, request: Request, custom_key: str = None):
        client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
        key = custom_key or f"{client_ip}:{request.url.path}"

        now = time.time()
        window_cutoff = now - self.window_seconds
        burst_cutoff = now - self.burst_seconds

        with self.lock:
            timestamps = self.requests.get(key, [])
            # Prune old timestamps
            valid_timestamps = [ts for ts in timestamps if ts > window_cutoff]

            # Check burst limit
            recent_burst = [ts for ts in valid_timestamps if ts > burst_cutoff]
            if len(recent_burst) >= self.burst_limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={"error": "Too many requests in a short burst. Please slow down.", "code": "RATE_LIMIT_EXCEEDED"}
                )

            # Check window limit
            if len(valid_timestamps) >= self.limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={"error": "Too many requests. Rate limit exceeded. Please wait a moment.", "code": "RATE_LIMIT_EXCEEDED"}
                )

            valid_timestamps.append(now)
            self.requests[key] = valid_timestamps

# Pre-configured rate limit dependencies
rate_limiter_checkout = InMemoryRateLimiter(limit=40, window_seconds=60, burst_limit=10, burst_seconds=3)
rate_limiter_pay = InMemoryRateLimiter(limit=40, window_seconds=60, burst_limit=10, burst_seconds=3)
rate_limiter_import = InMemoryRateLimiter(limit=20, window_seconds=60, burst_limit=6, burst_seconds=3)
rate_limiter_products = InMemoryRateLimiter(limit=50, window_seconds=60, burst_limit=15, burst_seconds=3)
rate_limiter_unknown_scan = InMemoryRateLimiter(limit=60, window_seconds=60, burst_limit=15, burst_seconds=3)
rate_limiter_reset = InMemoryRateLimiter(limit=10, window_seconds=60, burst_limit=3, burst_seconds=3)

def check_checkout_rate_limit(request: Request):
    rate_limiter_checkout.check(request)

def check_pay_rate_limit(request: Request):
    rate_limiter_pay.check(request)

def check_import_rate_limit(request: Request):
    rate_limiter_import.check(request)

def check_products_rate_limit(request: Request):
    rate_limiter_products.check(request)

def check_unknown_scan_rate_limit(request: Request):
    rate_limiter_unknown_scan.check(request)

def check_reset_rate_limit(request: Request):
    rate_limiter_reset.check(request)

