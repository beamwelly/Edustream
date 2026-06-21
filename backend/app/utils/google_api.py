import os
from dotenv import load_dotenv
load_dotenv()
import httpx
import uuid
import re
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional, Dict, Any

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

def get_google_auth_url() -> str:
    """
    Generates the Google OAuth 2.0 Consent Screen URL.
    Requests offline access and force consent to guarantee receiving a refresh token.
    """
    scopes = [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ]
    scope_str = " ".join(scopes)
    
    # 1. Log exact details
    print("--------------------------------------------------")
    print("GOOGLE OAUTH INIT DETAILS:")
    print(f"client_id: {GOOGLE_CLIENT_ID}")
    print(f"redirect_uri: {GOOGLE_REDIRECT_URI}")
    print(f"scopes: {scopes}")
    print("--------------------------------------------------")
    
    # 2. Log redirect URI config
    print(f"GOOGLE_REDIRECT_URI: {GOOGLE_REDIRECT_URI}")
        
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        f"&scope={scope_str}"
        "&access_type=offline"
        "&prompt=consent"
    )
    return url

async def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """
    Exchanges authorization code for access and refresh tokens.
    """
    url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post(url, data=data)
        if res.status_code == 200:
            return res.json()
        else:
            raise Exception(f"Failed to exchange Google OAuth code: {res.status_code} - {res.text}")

async def get_user_email(access_token: str) -> str:
    """
    Retrieves the connected user's Google email address.
    """
    url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        if res.status_code == 200:
            data = res.json()
            return data.get("email", "")
        else:
            raise Exception(f"Failed to fetch user email: {res.status_code} - {res.text}")

async def refresh_google_token(refresh_token: str) -> Dict[str, Any]:
    """
    Refreshes an expired access token using the refresh token.
    """
    url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post(url, data=data)
        if res.status_code == 200:
            return res.json()
        else:
            raise Exception(f"Failed to refresh Google token: {res.status_code} - {res.text}")

def format_datetime_to_iso(date_str: str, time_str: str) -> str:
    """
    Helper to cleanly parse dynamic date and time input formats (e.g. 10:00 AM, 14:00, etc.)
    into Google-compatible ISO 8601 strings with Asia/Kolkata (+05:30) offset.
    """
    date_str = date_str.strip()
    time_str = time_str.strip()
    
    # Check 12-hour AM/PM format
    match_12 = re.match(r"(\d+):(\d+)\s*(AM|PM)", time_str, re.IGNORECASE)
    if match_12:
        hour = int(match_12.group(1))
        minute = int(match_12.group(2))
        ampm = match_12.group(3).upper()
        if ampm == "PM" and hour < 12:
            hour += 12
        elif ampm == "AM" and hour == 12:
            hour = 0
        time_str = f"{hour:02d}:{minute:02d}"
    
    # 24-hour format
    match_24 = re.match(r"(\d+):(\d+)", time_str)
    if match_24:
        hour = int(match_24.group(1))
        minute = int(match_24.group(2))
        res_iso = f"{date_str}T{hour:02d}:{minute:02d}:00+05:30"
        print(f"Generated datetime: date_str={date_str}, time_str={time_str} -> ISO={res_iso}")
        return res_iso
    
    raise ValueError(f"Invalid datetime format: Date='{date_str}', Time='{time_str}' could not be parsed.")

async def create_google_calendar_meet(
    access_token: str,
    title: str,
    agenda: Optional[str],
    meeting_date: str,
    start_time: str,
    end_time: str,
    attendees_emails: list
) -> Tuple[str, str]:
    """
    Creates a Google Calendar event with an auto-generated Google Meet link.
    Returns:
    (google_event_id, google_meet_link)
    """
    # 1. Validate Attendee Emails
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    for email in attendees_emails:
        if email:
            email_cleaned = email.strip()
            if not re.match(email_regex, email_cleaned):
                raise ValueError(f"Invalid attendee email: '{email_cleaned}' is not a valid email address.")

    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # 2. Parse and format RFC3339 date strings
    start_iso = format_datetime_to_iso(meeting_date, start_time)
    end_iso = format_datetime_to_iso(meeting_date, end_time)
    
    # Unique request ID to avoid meeting duplication
    request_id = str(uuid.uuid4())
    
    payload = {
        "summary": title,
        "description": agenda or "Masterclass scheduled meeting.",
        "start": {
            "dateTime": start_iso,
            "timeZone": "Asia/Kolkata"
        },
        "end": {
            "dateTime": end_iso,
            "timeZone": "Asia/Kolkata"
        },
        "attendees": [{"email": email.strip()} for email in attendees_emails if email],
        "conferenceData": {
            "createRequest": {
                "requestId": request_id,
                "conferenceSolutionKey": {
                    "type": "hangoutsMeet"
                }
            }
        }
    }
    
    # Task 1: Print full payload before sending
    import json
    print("==================================================")
    print("GOOGLE CALENDAR PAYLOAD")
    print("==================================================")
    print(json.dumps(payload, indent=2))
    print("==================================================")
    
    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload, headers=headers)
        if res.status_code == 200:
            data = res.json()
            event_id = data.get("id", "")
            
            # Find Meet Link in conferenceData
            meet_link = ""
            conf_data = data.get("conferenceData", {})
            entry_points = conf_data.get("entryPoints", [])
            for ep in entry_points:
                if ep.get("entryPointType") == "video":
                    meet_link = ep.get("uri", "")
                    break
            
            # Fallback to hangoutLink if meet link not in entryPoints
            if not meet_link:
                meet_link = data.get("hangoutLink", "")
                
            return event_id, meet_link
        else:
            # Task 2: Print full error response body on failure
            print("==================================================")
            print("GOOGLE ERROR RESPONSE")
            print("==================================================")
            print(f"Status Code: {res.status_code}")
            print(f"Response Text: {res.text}")
            try:
                print(json.dumps(res.json(), indent=2))
            except Exception:
                print("Could not parse as JSON.")
            print("==================================================")
            
            # Extract detailed error message if possible
            err_msg = "Google Calendar rejected conferenceData"
            try:
                res_data = res.json()
                if "error" in res_data and "message" in res_data["error"]:
                    err_msg = res_data["error"]["message"]
            except Exception:
                pass
            raise Exception(f"Failed to create Google Calendar event: {res.status_code} - {err_msg}")

async def diagnose_google_calendar_event(access_token: str) -> dict:
    import json
    import httpx
    import uuid
    from datetime import datetime, timedelta
    
    # Generate tomorrow's date at 10:00 AM and 11:00 AM in Asia/Kolkata timezone
    now = datetime.now()
    tomorrow = now + timedelta(days=1)
    
    # Format to ISO 8601 with Asia/Kolkata offset (+05:30)
    start_dt = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 10, 0, 0)
    end_dt = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 11, 0, 0)
    
    start_iso = start_dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")
    end_iso = end_dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")
    
    # --- Step 1: Normal Event without conferenceData ---
    normal_payload = {
        "summary": "Test Event (Antigravity Diagnostic)",
        "start": {
            "dateTime": start_iso,
            "timeZone": "Asia/Kolkata"
        },
        "end": {
            "dateTime": end_iso,
            "timeZone": "Asia/Kolkata"
        }
    }
    
    print("==================================================")
    print("DIAGNOSTIC STEP 1: NORMAL EVENT PAYLOAD")
    print("==================================================")
    print(json.dumps(normal_payload, indent=2))
    print("==================================================")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    url_normal = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    
    async with httpx.AsyncClient() as client:
        res_normal = await client.post(url_normal, json=normal_payload, headers=headers)
        if res_normal.status_code != 200:
            print("==================================================")
            print("DIAGNOSTIC STEP 1 FAILED")
            print("==================================================")
            print(f"Status Code: {res_normal.status_code}")
            print(f"Response: {res_normal.text}")
            print("==================================================")
            raise Exception(f"Normal Event failed: {res_normal.status_code} - {res_normal.text}")
            
        normal_data = res_normal.json()
        print("==================================================")
        print("DIAGNOSTIC STEP 1 SUCCESSFUL")
        print("==================================================")
        print(f"Created Event ID: {normal_data.get('id')}")
        print("==================================================")
        
        # --- Step 2: Meet Event with conferenceData ---
        request_id = str(uuid.uuid4())
        meet_payload = {
            "summary": "Test Meet Event (Antigravity Diagnostic)",
            "description": "Diagnostic test event with conference data.",
            "start": {
                "dateTime": start_iso,
                "timeZone": "Asia/Kolkata"
            },
            "end": {
                "dateTime": end_iso,
                "timeZone": "Asia/Kolkata"
            },
            "conferenceData": {
                "createRequest": {
                    "requestId": request_id,
                    "conferenceSolutionKey": {
                        "type": "hangoutsMeet"
                    }
                }
            }
        }
        
        print("==================================================")
        print("DIAGNOSTIC STEP 2: MEET EVENT PAYLOAD")
        print("==================================================")
        print(json.dumps(meet_payload, indent=2))
        print("==================================================")
        
        url_meet = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1"
        res_meet = await client.post(url_meet, json=meet_payload, headers=headers)
        if res_meet.status_code != 200:
            print("==================================================")
            print("DIAGNOSTIC STEP 2 FAILED")
            print("==================================================")
            print(f"Status Code: {res_meet.status_code}")
            print(f"Response: {res_meet.text}")
            print("==================================================")
            raise Exception(f"Meet Event failed: {res_meet.status_code} - {res_meet.text}")
            
        meet_data = res_meet.json()
        print("==================================================")
        print("DIAGNOSTIC STEP 2 SUCCESSFUL")
        print("==================================================")
        print(f"Created Meet Event ID: {meet_data.get('id')}")
        print(f"Created Meet Link: {meet_data.get('hangoutLink')}")
        print("==================================================")
        
        return {
            "status": "success",
            "normal_event": normal_data,
            "meet_event": meet_data
        }
