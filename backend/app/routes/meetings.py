from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, update, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from app.database.session import get_db
from app.models.user import User
from app.routes.users import require_permission
from app.models.meeting import Meeting, GoogleIntegration
from app.utils.security import decode_access_token
from app.utils.google_api import (
    get_google_auth_url,
    refresh_google_token,
    create_google_calendar_meet
)
from app.services.email_service import send_meeting_email
from app.services.notification_service import create_notification

router = APIRouter(prefix="/meetings", tags=["Meeting Management"])
security = HTTPBearer()

def normalize_and_get_slot(time_str: str):
    t = time_str.strip().upper()
    slot_map = {
        "10:00 AM": ("10:00 AM", "10:30 AM"),
        "10:30 AM": ("10:30 AM", "11:00 AM"),
        "11:00 AM": ("11:00 AM", "11:30 AM"),
        "11:30 AM": ("11:30 AM", "12:00 PM"),
        "02:00 PM": ("02:00 PM", "02:30 PM"),
        "2:00 PM": ("02:00 PM", "02:30 PM"),
        "02:30 PM": ("02:30 PM", "03:00 PM"),
        "2:30 PM": ("02:30 PM", "03:00 PM"),
        "03:00 PM": ("03:00 PM", "03:30 PM"),
        "3:00 PM": ("03:00 PM", "03:30 PM"),
        "03:30 PM": ("03:30 PM", "04:00 PM"),
        "3:30 PM": ("03:30 PM", "04:00 PM"),
    }
    if t in slot_map:
        return slot_map[t]
    t_no_space = t.replace(" ", "")
    slot_map_no_space = {k.replace(" ", ""): v for k, v in slot_map.items()}
    if t_no_space in slot_map_no_space:
        return slot_map_no_space[t_no_space]
    return None

def parse_meeting_datetime(date_str: str, time_str: str) -> datetime:
    t_str = time_str.strip().upper()
    dt_str = f"{date_str.strip()} {t_str}"
    for fmt in ("%Y-%m-%d %I:%M %p", "%Y-%m-%d %I:%M%p", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Invalid date/time format: {date_str} {time_str}")

# --- Auth Dependencies ---
async def get_current_active_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token."
        )
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing required user identity claims."
        )
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with this session no longer exists."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )
    return user

async def get_current_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. This action requires Admin privileges."
        )
    return current_user

# --- Pydantic Schemas ---
class MeetingRequestPayload(BaseModel):
    title: str
    agenda: Optional[str] = None
    requested_to_user_id: int
    meeting_date: str
    start_time: str
    notes: Optional[str] = None

class MeetingSchedulePayload(BaseModel):
    title: str
    agenda: Optional[str] = None
    meeting_date: str
    start_time: str
    end_time: str
    attendees: List[str]

class PostMeetingNotesPayload(BaseModel):
    notes: Optional[str] = None
    action_items: Optional[str] = None
    next_steps: Optional[str] = None

class UserInfoResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    organization_name: Optional[str] = None

# --- Helper function for dynamic OAuth token refresh ---
async def get_valid_google_token(db: AsyncSession) -> Optional[str]:
    stmt = select(GoogleIntegration).order_by(GoogleIntegration.id.desc())
    res = await db.execute(stmt)
    integration = res.scalars().first()
    if not integration:
        return None

    now = datetime.now(timezone.utc)
    # Check if token is expired or close to expiring (within 2 minutes)
    token_exp_utc = integration.token_expiry
    if token_exp_utc.tzinfo is None:
        token_exp_utc = token_exp_utc.replace(tzinfo=timezone.utc)

    if token_exp_utc < (now + timedelta(minutes=2)):
        if not integration.refresh_token:
            return None
        try:
            refresh_data = await refresh_google_token(integration.refresh_token)
            integration.access_token = refresh_data["access_token"]
            expires_in = refresh_data.get("expires_in", 3600)
            integration.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            await db.commit()
            await db.refresh(integration)
        except Exception as e:
            print(f"Error auto-refreshing Google token: {e}")
            return None
            
    return integration.access_token

# --- Endpoints ---

@router.get("/users", response_model=List[UserInfoResponse])
async def list_available_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("meetings"))
):
    """
    Returns filtered list of active users that can be scheduled for meetings, based on role permissions.
    """
    stmt = select(User).where(User.is_active == True)
    
    if current_user.role in ("owner", "employee", "user"):
        # Standard users request Admin
        stmt = stmt.where(User.role == "admin")
    elif current_user.role == "admin":
        # Admin requests standard Users
        stmt = stmt.where(User.role.in_(["owner", "employee", "user"]))
        
    res = await db.execute(stmt)
    users = res.scalars().all()
    
    out = []
    for u in users:
        out.append(UserInfoResponse(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            role=u.role,
            organization_name=u.company_name
        ))
    return out

@router.post("/request")
async def request_meeting(
    payload: MeetingRequestPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("meetings"))
):
    """
    Enables any authenticated user (Super Admin, Admin, standard User) to request a meeting.
    """
    slot_times = normalize_and_get_slot(payload.start_time)
    if not slot_times:
        raise HTTPException(
            status_code=400,
            detail="Invalid meeting slot. Available slots are: 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM, 2:00 PM, 2:30 PM, 3:00 PM, or 3:30 PM."
        )
    start_norm, end_norm = slot_times

    # Check if requested to user exists
    target_stmt = select(User).where(User.id == payload.requested_to_user_id)
    target_res = await db.execute(target_stmt)
    target_user = target_res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Requested person not found in system.")

    # Overlap check
    overlap_stmt = select(Meeting).where(
        Meeting.meeting_date == payload.meeting_date,
        Meeting.status == "scheduled",
        or_(
            Meeting.requested_by_user_id == current_user.id,
            Meeting.requested_to_user_id == current_user.id,
            Meeting.requested_by_user_id == payload.requested_to_user_id,
            Meeting.requested_to_user_id == payload.requested_to_user_id
        )
    )
    overlap_res = await db.execute(overlap_stmt)
    existing_meetings = overlap_res.scalars().all()
    
    new_start = parse_meeting_datetime(payload.meeting_date, start_norm)
    new_end = parse_meeting_datetime(payload.meeting_date, end_norm)
    
    for em in existing_meetings:
        try:
            em_start = parse_meeting_datetime(em.meeting_date, em.start_time)
            em_end = parse_meeting_datetime(em.meeting_date, em.end_time)
            if new_start < em_end and em_start < new_end:
                raise HTTPException(
                    status_code=400,
                    detail="This time slot overlaps with an already scheduled meeting for one of the participants."
                )
        except ValueError:
            continue
        
    meeting = Meeting(
        title=payload.title,
        agenda=payload.agenda,
        requested_by_user_id=current_user.id,
        requested_to_user_id=payload.requested_to_user_id,
        organization_id=current_user.organization_id,
        meeting_date=payload.meeting_date,
        start_time=start_norm,
        end_time=end_norm,
        status="pending",
        notes=payload.notes
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)

    # Notify admin
    await create_notification(
        db=db,
        title="New Meeting Request",
        message=f"{current_user.full_name or current_user.email} requested a meeting: {meeting.title}",
        type="meeting_request",
        reference_id=str(meeting.id),
        target_group="admins"
    )

    return meeting

@router.get("/list")
async def list_meetings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("meetings"))
):
    """
    Fetches real database-driven meetings depending on role permissions.
    """
    stmt = select(Meeting)
    if current_user.role == "admin":
        # Admin sees all meetings in the system
        pass
    else:
        # Standard User sees only meetings they requested or were invited to
        stmt = stmt.where(
            or_(
                Meeting.requested_by_user_id == current_user.id,
                Meeting.requested_to_user_id == current_user.id
            )
        )
        
    res = await db.execute(stmt)
    meetings = res.scalars().all()
    
    # Preload user emails/names to avoid lazy-loading crashes
    out = []
    for m in meetings:
        req_by_stmt = select(User).where(User.id == m.requested_by_user_id)
        req_by_res = await db.execute(req_by_stmt)
        req_by = req_by_res.scalar_one_or_none()
        
        req_to_stmt = select(User).where(User.id == m.requested_to_user_id)
        req_to_res = await db.execute(req_to_stmt)
        req_to = req_to_res.scalar_one_or_none()
        
        req_by_org_name = (req_by.company_name or "Masterclass") if req_by else "Masterclass"
        req_to_org_name = (req_to.company_name or "Masterclass") if req_to else "Masterclass"
        
        out.append({
            "id": m.id,
            "title": m.title,
            "agenda": m.agenda,
            "requested_by": {
                "id": req_by.id if req_by else None,
                "full_name": req_by.full_name if req_by else "Unknown",
                "email": req_by.email if req_by else "",
                "role": req_by.role if req_by else "user",
                "organization_name": req_by_org_name
            } if req_by else None,
            "requested_to": {
                "id": req_to.id if req_to else None,
                "full_name": req_to.full_name if req_to else "Unknown",
                "email": req_to.email if req_to else "",
                "role": req_to.role if req_to else "user",
                "organization_name": req_to_org_name
            } if req_to else None,
            "meeting_date": m.meeting_date,
            "start_time": m.start_time,
            "end_time": m.end_time,
            "google_event_id": m.google_event_id,
            "google_meet_link": m.google_meet_link,
            "status": m.status,
            "notes": m.notes,
            "action_items": m.action_items,
            "next_steps": m.next_steps,
            "created_at": m.created_at
        })
    return out

@router.post("/{meeting_id}/schedule")
async def schedule_meeting(
    meeting_id: int,
    payload: MeetingSchedulePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Super Admin schedules and approves a meeting, generating Google Calendar Event & Meet link.
    Automatically sends SMTP invitation email.
    """
    print("==================================================")
    print("POST /meetings/{id}/schedule — TEMPORARY LOGS")
    print(f"1. Incoming payload: {payload.dict()}")
    print(f"2. Meeting ID: {meeting_id}")
    
    # Check if attendees list is empty
    print(f"4. Attendees: {payload.attendees}")
    if not payload.attendees or len(payload.attendees) == 0:
        print("Validation Result: FAILED (Attendees list empty)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation failed because: Attendees list empty."
        )

    # 1. Fetch valid google OAuth token
    access_token = await get_valid_google_token(db)
    print(f"7. Google integration status: {'Connected' if access_token else 'Token Missing'}")
    if not access_token:
        print("Validation Result: FAILED (Google token missing)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation failed because: Google token missing. Please connect Google first inside Super Admin Settings."
        )
        
    # Check meeting lookup
    stmt = select(Meeting).where(Meeting.id == meeting_id)
    res = await db.execute(stmt)
    meeting = res.scalar_one_or_none()
    print(f"3. Meeting lookup result: {'Found' if meeting else 'Not Found'}")
    if not meeting:
        print("Validation Result: FAILED (Meeting not found)")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation failed because: Meeting ID {meeting_id} not found."
        )

    slot_times = normalize_and_get_slot(payload.start_time)
    if not slot_times:
        raise HTTPException(
            status_code=400,
            detail="Invalid meeting start time. Available slots start at: 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM, 2:00 PM, 2:30 PM, 3:00 PM, or 3:30 PM."
        )
    start_norm, end_norm = slot_times

    # Overlap check for all attendees and request participants
    attendee_emails = [e.strip().lower() for e in payload.attendees]
    user_stmt = select(User).where(func.lower(User.email).in_(attendee_emails))
    user_res = await db.execute(user_stmt)
    attendee_users = user_res.scalars().all()
    participant_ids = {u.id for u in attendee_users}
    participant_ids.add(meeting.requested_by_user_id)
    if meeting.requested_to_user_id:
        participant_ids.add(meeting.requested_to_user_id)

    overlap_stmt = select(Meeting).where(
        Meeting.meeting_date == payload.meeting_date,
        Meeting.status == "scheduled",
        Meeting.id != meeting_id,
        or_(
            Meeting.requested_by_user_id.in_(list(participant_ids)),
            Meeting.requested_to_user_id.in_(list(participant_ids))
        )
    )
    overlap_res = await db.execute(overlap_stmt)
    existing_meetings = overlap_res.scalars().all()
    
    new_start = parse_meeting_datetime(payload.meeting_date, start_norm)
    new_end = parse_meeting_datetime(payload.meeting_date, end_norm)
    
    for em in existing_meetings:
        try:
            em_start = parse_meeting_datetime(em.meeting_date, em.start_time)
            em_end = parse_meeting_datetime(em.meeting_date, em.end_time)
            if new_start < em_end and em_start < new_end:
                raise HTTPException(
                    status_code=400,
                    detail=f"This time slot overlaps with an already scheduled meeting ({em.title}) for one of the participants."
                )
        except ValueError:
            continue

    print(f"5. Date: {payload.meeting_date}")
    print(f"6. Time: {start_norm} - {end_norm}")
    print("8. Validation result: PASSED")
    print("==================================================")
    
    # Task 5: Fetch Google Integration details for Pre-Event Scope Verification
    integ_stmt = select(GoogleIntegration).order_by(GoogleIntegration.id.desc())
    integ_res = await db.execute(integ_stmt)
    integration = integ_res.scalars().first()
    if integration:
        print("==================================================")
        print("PRE-EVENT GOOGLE OAUTH AUDIT")
        print("==================================================")
        print(f"Connected User Email: {integration.google_email}")
        print(f"Token Expiry: {integration.token_expiry}")
        print("Requested Scopes: email, profile, openid, https://www.googleapis.com/auth/calendar")
        print("==================================================")
        
    # 2. Call Google Calendar API to create meeting with dynamic Meet Link
    try:
        event_id, meet_link = await create_google_calendar_meet(
            access_token=access_token,
            title=payload.title,
            agenda=payload.agenda,
            meeting_date=payload.meeting_date,
            start_time=start_norm,
            end_time=end_norm,
            attendees_emails=payload.attendees
        )
    except Exception as e:
        error_msg = str(e)
        print(f"9. Exact reason for failure: Google Calendar API exception: {error_msg}")
        
        # Task 6: Return informative scheduling errors
        status_code = status.HTTP_400_BAD_REQUEST
        detail_msg = error_msg
        
        if "Invalid attendee email" in error_msg:
            detail_msg = f"Invalid attendee email: {error_msg}"
        elif "Invalid datetime format" in error_msg:
            detail_msg = f"Invalid datetime format: {error_msg}"
        elif "conferenceData" in error_msg or "rejected" in error_msg:
            detail_msg = f"Google Calendar rejected conferenceData: {error_msg}"
        else:
            status_code = status.HTTP_424_FAILED_DEPENDENCY
            detail_msg = f"Failed to schedule Google Calendar event: {error_msg}"
            
        raise HTTPException(
            status_code=status_code,
            detail=detail_msg
        )
        
    # 3. Update meeting in DB
    meeting.title = payload.title
    meeting.agenda = payload.agenda
    meeting.meeting_date = payload.meeting_date
    meeting.start_time = start_norm
    meeting.end_time = end_norm
    meeting.google_event_id = event_id
    meeting.google_meet_link = meet_link
    meeting.status = "scheduled"
    await db.commit()
    await db.refresh(meeting)
    
    # 4. Fetch attendees to send SMTP emails
    # Also email requester and recipient by default
    by_stmt = select(User).where(User.id == meeting.requested_by_user_id)
    by_res = await db.execute(by_stmt)
    by_user = by_res.scalar_one_or_none()
    
    to_stmt = select(User).where(User.id == meeting.requested_to_user_id)
    to_res = await db.execute(to_stmt)
    to_user = to_res.scalar_one_or_none()
    
    unique_emails = set(payload.attendees)
    if by_user:
        unique_emails.add(by_user.email)
    if to_user:
        unique_emails.add(to_user.email)
        
    for email in unique_emails:
        try:
            # Resolve name if possible
            resolved_name = "Meeting Participant"
            if by_user and email == by_user.email:
                resolved_name = by_user.full_name
            elif to_user and email == to_user.email:
                resolved_name = to_user.full_name
                
            await send_meeting_email(
                recipient_email=email,
                recipient_name=resolved_name,
                title=payload.title,
                date_str=payload.meeting_date,
                time_str=f"{payload.start_time} - {payload.end_time}",
                agenda=payload.agenda or "",
                meet_link=meet_link
            )
        except Exception as mail_err:
            print(f"Failed to email invite to {email}: {mail_err}")
            
    return meeting

@router.post("/{meeting_id}/accept")
async def accept_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("meetings"))
):
    stmt = select(Meeting).where(Meeting.id == meeting_id)
    res = await db.execute(stmt)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting request not found.")
        
    # Recipient or Admin can accept
    if current_user.role != "admin" and meeting.requested_to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to accept this meeting request.")
        
    meeting.status = "accepted"
    await db.commit()
    return {"message": "Meeting request accepted successfully."}

@router.post("/{meeting_id}/reject")
async def reject_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("meetings"))
):
    stmt = select(Meeting).where(Meeting.id == meeting_id)
    res = await db.execute(stmt)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting request not found.")
        
    # Recipient, requester, or Admin can reject/cancel
    if (
        current_user.role != "admin"
        and meeting.requested_to_user_id != current_user.id
        and meeting.requested_by_user_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="You are not authorized to reject this meeting request.")
        
    meeting.status = "cancelled"
    await db.commit()
    return {"message": "Meeting request rejected/cancelled."}

@router.post("/{meeting_id}/complete")
async def complete_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    stmt = select(Meeting).where(Meeting.id == meeting_id)
    res = await db.execute(stmt)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting request not found.")
        
    meeting.status = "completed"
    await db.commit()
    return {"message": "Meeting marked as completed successfully."}

@router.post("/{meeting_id}/notes")
async def save_meeting_notes(
    meeting_id: int,
    payload: PostMeetingNotesPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Saves post-meeting notes, MOM, Action Items, and Next Steps. Only Super Admin has edit access.
    """
    stmt = select(Meeting).where(Meeting.id == meeting_id)
    res = await db.execute(stmt)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
        
    meeting.notes = payload.notes
    meeting.action_items = payload.action_items
    meeting.next_steps = payload.next_steps
    await db.commit()
    await db.refresh(meeting)
    return meeting
