import os
import base64
import time
import httpx
from datetime import datetime, timezone
from fastapi import HTTPException

# Global in-memory cache for token
_token_cache = {
    "access_token": None,
    "expires_at": 0
}

def get_token() -> str:
    """
    Fetches a Server-to-Server OAuth token for Zoom and caches it.
    """
    global _token_cache
    now = time.time()
    
    # Return cached token if valid (with 60 seconds buffer)
    if _token_cache["access_token"] and _token_cache["expires_at"] > now + 60:
        return _token_cache["access_token"]
        
    account_id = os.getenv("ZOOM_ACCOUNT_ID")
    client_id = os.getenv("ZOOM_CLIENT_ID")
    client_secret = os.getenv("ZOOM_CLIENT_SECRET")
    
    if not all([account_id, client_id, client_secret]):
        raise RuntimeError("Missing required Zoom credentials in environment variables.")
        
    url = f"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={account_id}"
    
    auth_str = f"{client_id}:{client_secret}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    
    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    with httpx.Client() as client:
        res = client.post(url, headers=headers)
        if res.status_code != 200:
            raise RuntimeError(f"Failed to fetch Zoom OAuth token: {res.status_code} - {res.text}")
        data = res.json()
        
    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = now + data.get("expires_in", 3599)
    
    return _token_cache["access_token"]

def create_meeting(title: str, start_time, duration_minutes: int):
    """
    Creates a Zoom meeting using Server-to-Server OAuth.
    start_time can be a datetime object or an ISO-8601 string.
    Returns a dict with join_url and meeting_id.
    """
    token = get_token()
    url = "https://api.zoom.us/v2/users/me/meetings"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    if isinstance(start_time, datetime):
        if start_time.tzinfo:
            start_time = start_time.astimezone(timezone.utc)
        start_time_str = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        start_time_str = str(start_time)
        
    payload = {
        "topic": title,
        "type": 2,  # Scheduled meeting
        "start_time": start_time_str,
        "duration": duration_minutes,
        "timezone": "UTC",
        "settings": {
            "host_video": True,
            "participant_video": True,
            "join_before_host": True,
            "mute_upon_entry": True,
            "watermark": False,
            "use_pmi": False,
            "approval_type": 2,  # No registration required
            "audio": "both",
            "auto_recording": "cloud"
        }
    }
    
    with httpx.Client() as client:
        res = client.post(url, headers=headers, json=payload)
        if res.status_code != 201:
            raise HTTPException(
                status_code=res.status_code,
                detail=f"Zoom API Error: {res.text}"
            )
        data = res.json()
        
    return {
        "join_url": data.get("join_url"),
        "meeting_id": str(data.get("id"))
    }

def create_zoom_webinar(title: str, description: str, start_time: datetime, duration_minutes: int):
    """
    Creates a Zoom Webinar using Server-to-Server OAuth.
    Returns a dict with start_url, join_url, and webinar_id.
    """
    token = get_token()
    url = "https://api.zoom.us/v2/users/me/webinars"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    if start_time.tzinfo:
        start_time_utc = start_time.astimezone(timezone.utc)
    else:
        start_time_utc = start_time.replace(tzinfo=timezone.utc)
        
    start_time_str = start_time_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    payload = {
        "topic": title,
        "agenda": description or "",
        "type": 5,  # Scheduled webinar
        "start_time": start_time_str,
        "duration": duration_minutes,
        "timezone": "UTC",
        "settings": {
            "host_video": True,
            "panelists_video": True,
            "practice_session": True,
            "approval_type": 2,  # No registration required
            "audio": "both",
            "auto_recording": "cloud"
        }
    }
    
    with httpx.Client() as client:
        res = client.post(url, headers=headers, json=payload)
        if res.status_code != 201:
            raise HTTPException(
                status_code=res.status_code,
                detail=f"Zoom Webinar API Error: {res.text}"
            )
        data = res.json()
        
    return {
        "webinar_id": str(data.get("id")),
        "join_url": data.get("join_url"),
        "start_url": data.get("start_url")
    }

def update_zoom_webinar(webinar_id: str, title: str, description: str, start_time: datetime, duration_minutes: int):
    """
    Updates an existing Zoom Webinar.
    """
    token = get_token()
    url = f"https://api.zoom.us/v2/webinars/{webinar_id}"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    if start_time.tzinfo:
        start_time_utc = start_time.astimezone(timezone.utc)
    else:
        start_time_utc = start_time.replace(tzinfo=timezone.utc)
        
    start_time_str = start_time_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    payload = {
        "topic": title,
        "agenda": description or "",
        "start_time": start_time_str,
        "duration": duration_minutes
    }
    
    with httpx.Client() as client:
        res = client.patch(url, headers=headers, json=payload)
        if res.status_code not in (200, 204):
            raise HTTPException(
                status_code=res.status_code,
                detail=f"Zoom Webinar Update Error: {res.text}"
            )
    return True

def delete_zoom_webinar(webinar_id: str):
    """
    Deletes an existing Zoom Webinar.
    """
    token = get_token()
    url = f"https://api.zoom.us/v2/webinars/{webinar_id}"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    with httpx.Client() as client:
        res = client.delete(url, headers=headers)
        if res.status_code not in (200, 204) and res.status_code != 404:
            raise HTTPException(
                status_code=res.status_code,
                detail=f"Zoom Webinar Delete Error: {res.text}"
            )
    return True

def get_zoom_webinar_recordings(webinar_id: str):
    """
    Fetches recordings for a specific Zoom Webinar.
    """
    token = get_token()
    url = f"https://api.zoom.us/v2/webinars/{webinar_id}/recordings"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    with httpx.Client() as client:
        res = client.get(url, headers=headers)
        if res.status_code == 404:
            return None
        if res.status_code != 200:
            raise HTTPException(
                status_code=res.status_code,
                detail=f"Zoom Webinar Recording Fetch Error: {res.text}"
            )
        return res.json()
