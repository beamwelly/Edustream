import os
import json
import time
import redis
from typing import Optional, Any

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

_redis_client = None
_redis_disabled = False
_last_connect_attempt = 0.0
CONNECT_RETRY_INTERVAL = 60.0  # Only retry connection once every 60 seconds if it has failed

def get_redis_client():
    global _redis_client, _redis_disabled, _last_connect_attempt
    
    current_time = time.time()
    if _redis_client is None:
        # If we failed recently, do not retry immediately to avoid blocking and log spam
        if _redis_disabled and (current_time - _last_connect_attempt < CONNECT_RETRY_INTERVAL):
            return None
            
        _last_connect_attempt = current_time
        try:
            _redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                socket_connect_timeout=1.0,
                decode_responses=True
            )
            # Test connection
            _redis_client.ping()
            _redis_disabled = False
        except Exception:
            # Silent fallback - do not print connection errors in logs
            _redis_client = None
            _redis_disabled = True
            
    return _redis_client

def cache_get(key: str) -> Optional[Any]:
    client = get_redis_client()
    if not client:
        return None
    try:
        val = client.get(key)
        if val:
            return json.loads(val)
    except Exception:
        pass  # Silent fallback
    return None

def cache_set(key: str, value: Any, ttl: int) -> bool:
    client = get_redis_client()
    if not client:
        return False
    try:
        client.setex(key, ttl, json.dumps(value))
        return True
    except Exception:
        pass  # Silent fallback
    return False

def cache_delete(key: str) -> bool:
    client = get_redis_client()
    if not client:
        return False
    try:
        client.delete(key)
        return True
    except Exception:
        pass  # Silent fallback
    return False

def cache_invalidate_all():
    client = get_redis_client()
    if not client:
        return False
    try:
        patterns = [
            "items:*", 
            "search:*", 
            "categories", 
            "dashboard:*", 
            "content:list*", 
            "content:categories*", 
            "content:recent*"
        ]
        for pattern in patterns:
            keys = client.keys(pattern)
            if keys:
                client.delete(*keys)
        return True
    except Exception:
        pass  # Silent fallback
    return False
