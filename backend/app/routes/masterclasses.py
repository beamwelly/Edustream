import os
import io
import time
import json
import hmac
import hashlib
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, UploadFile, File, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, update, delete

from app.database.session import get_db
from app.database.database import SessionLocal
from app.models.user import User
from app.models.masterclass import (
    Masterclass, 
    MasterclassRecording, 
    MasterclassRegistration, 
    MasterclassWatchHistory, 
    MasterclassEmailLog
)
from app.models.notification import Notification
from app.routes.users_mgmt import get_current_admin
from app.routes.content import get_current_active_user
from app.services.zoom import (
    create_zoom_webinar,
    update_zoom_webinar,
    delete_zoom_webinar,
    get_zoom_webinar_recordings
)
from app.utils.supabase_storage import upload_file_to_supabase, create_signed_url, SUPABASE_URL, BUCKET_NAME
from app.services.email_service import send_email_async

router = APIRouter(prefix="/api/masterclasses", tags=["Masterclasses"])
zoom_router = APIRouter(tags=["Zoom Webhook"])

# --- Pydantic Schemas ---

class MasterclassResponse(BaseModel):
    masterclass_id: int
    title: str
    description: Optional[str] = None
    speaker: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int
    zoom_webinar_id: Optional[str] = None
    zoom_join_url: Optional[str] = None
    zoom_start_url: Optional[str] = None
    status: str
    recording_filename: Optional[str] = None
    recording_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    learning_outcomes: Optional[str] = None
    max_attendees: Optional[int] = None
    visibility: str
    source: str
    created_at: datetime

    class Config:
        from_attributes = True

class WatchProgressPayload(BaseModel):
    last_position_seconds: float
    max_position_seconds: float
    completion_percentage: float

async def sign_masterclass_thumbnail(mc: Masterclass):
    if not mc.thumbnail_url:
        return
    db_url = mc.thumbnail_url
    if "token" in db_url or "Expires" in db_url or not SUPABASE_URL or not BUCKET_NAME:
        return
    
    marker = f"/public/{BUCKET_NAME}/"
    if marker in db_url:
        path = db_url.split(marker)[-1]
        signed_url, _ = await create_signed_url(path)
        if signed_url:
            mc.thumbnail_url = signed_url

# --- Email Styling & Generator Helpers ---

def generate_email_template(title: str, content_html: str) -> str:
    """
    Standard responsive Masterclass email template.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{title}</title>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6; color: #1f2937; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }}
        .header {{ background-color: #dc2626; padding: 24px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }}
        .content {{ padding: 24px; line-height: 1.6; }}
        .thumbnail {{ width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; display: block; }}
        .title {{ font-size: 20px; font-weight: bold; color: #111827; margin: 0 0 10px 0; }}
        .speaker {{ font-size: 14px; color: #dc2626; font-weight: bold; margin-bottom: 20px; }}
        .details-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
        .details-table td {{ padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }}
        .details-label {{ font-weight: bold; width: 130px; color: #4b5563; }}
        .details-value {{ color: #111827; }}
        .button-container {{ text-align: center; margin: 30px 0 15px 0; }}
        .btn {{ display: inline-block; background-color: #dc2626; color: #ffffff !important; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2); }}
        .footer {{ background-color: #f9fafb; padding: 15px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Masterclass Portal</h1>
        </div>
        <div class="content">
          {content_html}
        </div>
        <div class="footer">
          &copy; {datetime.now().year} Masterclass. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

def generate_scheduled_email_body(webinar: Masterclass, user: User) -> str:
    thumbnail_img = f'<img src="{webinar.thumbnail_url}" class="thumbnail" alt="Thumbnail" />' if webinar.thumbnail_url else ""
    formatted_date = webinar.scheduled_at.strftime('%b %d, %Y at %I:%M %p UTC')
    
    html = f"""
      {thumbnail_img}
      <div class="title">{webinar.title}</div>
      <div class="speaker">Hosted by {webinar.speaker or 'Masterclass Expert'}</div>
      
      <p>Hello {user.full_name},</p>
      <p>We are excited to invite you to our newly scheduled webinar Masterclass. Secure your spot now!</p>
      
      <table class="details-table">
        <tr>
          <td class="details-label">Date & Time</td>
          <td class="details-value">{formatted_date}</td>
        </tr>
        <tr>
          <td class="details-label">Duration</td>
          <td class="details-value">{webinar.duration_minutes} Minutes</td>
        </tr>
        <tr>
          <td class="details-label">Category</td>
          <td class="details-value">{webinar.category or 'Professional Development'}</td>
        </tr>
      </table>
      
      <p>{webinar.description or ''}</p>
      
      <div class="button-container">
        <a href="{webinar.zoom_join_url or '#'}" class="btn">Register & Join</a>
      </div>
    """
    return generate_email_template("New Masterclass Scheduled", html)

def generate_updated_email_body(webinar: Masterclass, prev_data: dict) -> str:
    changes_html = ""
    for field, label in [
        ("title", "Title"),
        ("scheduled_at", "Date & Time"),
        ("duration_minutes", "Duration"),
        ("speaker", "Speaker"),
        ("description", "Description")
    ]:
        prev_val = prev_data.get(field)
        curr_val = getattr(webinar, field)
        
        if field == "scheduled_at":
            if isinstance(prev_val, datetime):
                prev_val = prev_val.strftime("%b %d, %Y %I:%M %p UTC")
            if isinstance(curr_val, datetime):
                curr_val = curr_val.strftime("%b %d, %Y %I:%M %p UTC")
                
        if str(prev_val) != str(curr_val):
            changes_html += f"""
            <tr>
              <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f3f4f6; font-size:13px;">{label}</td>
              <td style="padding: 8px; color: #dc2626; text-decoration: line-through; border-bottom: 1px solid #f3f4f6; font-size:13px;">{prev_val}</td>
              <td style="padding: 8px; color: #16a34a; font-weight: bold; border-bottom: 1px solid #f3f4f6; font-size:13px;">{curr_val}</td>
            </tr>
            """
            
    html = f"""
      <div class="title">Masterclass Updated: {webinar.title}</div>
      <p>The details for this scheduled webinar have been updated. Please check the changes below:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 13px;">Field</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 13px;">Previous</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 13px;">Updated</th>
          </tr>
        </thead>
        <tbody>
          {changes_html}
        </tbody>
      </table>
      
      <div class="button-container">
        <a href="{webinar.zoom_join_url or '#'}" class="btn">View Webinar Details</a>
      </div>
    """
    return generate_email_template("Masterclass Updated", html)

def generate_cancelled_email_body(webinar: Masterclass, message: Optional[str]) -> str:
    formatted_date = webinar.scheduled_at.strftime('%b %d, %Y at %I:%M %p UTC')
    html = f"""
      <div class="title" style="color: #dc2626;">Webinar Cancelled</div>
      <p>Please note that the following masterclass has been cancelled:</p>
      <h3>{webinar.title}</h3>
      <p><strong>Original Schedule:</strong> {formatted_date}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p><strong>Cancellation Reason:</strong></p>
      <blockquote style="border-left: 4px solid #dc2626; padding-left: 15px; margin: 10px 0; color: #4b5563; font-style: italic;">
        {message or 'The session has been cancelled by the host.'}
      </blockquote>
    """
    return generate_email_template("Webinar Cancelled", html)

def generate_reminder_email_body(webinar: Masterclass, user: User, time_str: str) -> str:
    formatted_date = webinar.scheduled_at.strftime('%b %d, %Y at %I:%M %p UTC')
    html = f"""
      <div class="title">Starting in {time_str}!</div>
      <h3>{webinar.title}</h3>
      <p>Hello {user.full_name},</p>
      <p>This is a quick reminder that your masterclass webinar is starting in <strong>{time_str}</strong>. Click below to join the live session.</p>
      
      <table class="details-table">
        <tr>
          <td class="details-label">Date & Time</td>
          <td class="details-value">{formatted_date}</td>
        </tr>
        <tr>
          <td class="details-label">Speaker</td>
          <td class="details-value">{webinar.speaker or 'Masterclass Expert'}</td>
        </tr>
      </table>
      
      <div class="button-container">
        <a href="{webinar.zoom_join_url or '#'}" class="btn">Join Webinar Now</a>
      </div>
    """
    return generate_email_template("Webinar Starting Soon", html)

def generate_live_email_body(webinar: Masterclass, user: User) -> str:
    html = f"""
      <div class="title" style="color: #dc2626;">Live Now!</div>
      <h3>{webinar.title}</h3>
      <p>Hello {user.full_name},</p>
      <p>The masterclass webinar is now <strong>LIVE</strong>! Join the interactive stream immediately using the link below:</p>
      
      <div class="button-container">
        <a href="{webinar.zoom_join_url or '#'}" class="btn">Join Live Broadcast</a>
      </div>
    """
    return generate_email_template("Webinar is Live", html)

def generate_recording_email_body(webinar: Masterclass) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8081")
    thumbnail_img = f'<img src="{webinar.thumbnail_url}" class="thumbnail" alt="Thumbnail" />' if webinar.thumbnail_url else ""
    html = f"""
      {thumbnail_img}
      <div class="title">Webinar Recording Available</div>
      <h3>{webinar.title}</h3>
      <p>Missed the live broadcast? No worries! The full recorded session is now available for on-demand streaming inside the Masterclass portal.</p>
      
      <div class="button-container">
        <a href="{frontend_url}/masterclasses/{webinar.masterclass_id}/watch" class="btn">Watch Recording</a>
      </div>
    """
    return generate_email_template("Recording Available", html)

# --- Idempotent Email Delivery Logic ---

async def log_and_send_email(db: AsyncSession, user: User, webinar: Masterclass, email_type: str, subject: str, body: str):
    """
    Ensures email idempotency by checking and inserting masterclass_email_logs.
    """
    stmt = select(MasterclassEmailLog).where(
        MasterclassEmailLog.user_id == user.id,
        MasterclassEmailLog.webinar_id == webinar.masterclass_id,
        MasterclassEmailLog.email_type == email_type
    )
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return
        
    success = await send_email_async(user.email, subject, body, is_html=True)
    
    log_entry = MasterclassEmailLog(
        user_id=user.id,
        webinar_id=webinar.masterclass_id,
        email_type=email_type,
        status="success" if success else "failed"
    )
    db.add(log_entry)
    await db.commit()

# --- Background Task Workflows ---

async def notify_webinar_scheduled(webinar_id: int):
    async with SessionLocal() as db:
        stmt = select(Masterclass).where(Masterclass.masterclass_id == webinar_id)
        res = await db.execute(stmt)
        webinar = res.scalar_one_or_none()
        if not webinar:
            return
            
        user_stmt = select(User).where(User.is_active == True)
        user_res = await db.execute(user_stmt)
        users = user_res.scalars().all()
        
        for u in users:
            # Check masterclass and email preference
            if u.pref_email_notifications and u.pref_masterclass_notifications:
                subject = f"New Masterclass Scheduled: {webinar.title}"
                body = generate_scheduled_email_body(webinar, u)
                await log_and_send_email(db, u, webinar, "scheduled", subject, body)
                
            if u.pref_masterclass_notifications:
                notif = Notification(
                    user_id=u.id,
                    title="New Masterclass Scheduled",
                    message=f"'{webinar.title}' by {webinar.speaker} is scheduled for {webinar.scheduled_at.strftime('%b %d at %I:%M %p')}.",
                    type="masterclass_scheduled",
                    reference_id=str(webinar.masterclass_id)
                )
                db.add(notif)
        await db.commit()

async def notify_webinar_updated(webinar_id: int, prev_data: dict):
    async with SessionLocal() as db:
        stmt = select(Masterclass).where(Masterclass.masterclass_id == webinar_id)
        res = await db.execute(stmt)
        webinar = res.scalar_one_or_none()
        if not webinar:
            return
            
        user_stmt = select(User).where(User.is_active == True)
        user_res = await db.execute(user_stmt)
        users = user_res.scalars().all()
        
        for u in users:
            if u.pref_email_notifications and u.pref_masterclass_notifications:
                subject = f"Masterclass Updated: {webinar.title}"
                body = generate_updated_email_body(webinar, prev_data)
                await log_and_send_email(db, u, webinar, "updated", subject, body)
                
            if u.pref_masterclass_notifications:
                notif = Notification(
                    user_id=u.id,
                    title="Masterclass Updated",
                    message=f"The details for masterclass '{webinar.title}' have been modified.",
                    type="masterclass_updated",
                    reference_id=str(webinar.masterclass_id)
                )
                db.add(notif)
        await db.commit()

async def send_cancellation_and_delete(webinar_id: int, message: Optional[str]):
    async with SessionLocal() as db:
        stmt = select(Masterclass).where(Masterclass.masterclass_id == webinar_id)
        res = await db.execute(stmt)
        webinar = res.scalar_one_or_none()
        if not webinar:
            return
            
        user_stmt = select(User).where(User.is_active == True)
        user_res = await db.execute(user_stmt)
        users = user_res.scalars().all()
        
        for u in users:
            if u.pref_email_notifications and u.pref_masterclass_notifications:
                subject = f"Webinar Cancelled: {webinar.title}"
                body = generate_cancelled_email_body(webinar, message)
                await log_and_send_email(db, u, webinar, "cancelled", subject, body)
                
            if u.pref_masterclass_notifications:
                notif = Notification(
                    user_id=u.id,
                    title="Webinar Cancelled",
                    message=f"'{webinar.title}' scheduled for {webinar.scheduled_at.strftime('%b %d')} has been cancelled.",
                    type="masterclass_cancelled",
                    reference_id=str(webinar.masterclass_id)
                )
                db.add(notif)
        await db.commit()
        
        # Safe cascading delete now that logs & notifications are dispatched
        await db.delete(webinar)
        await db.commit()

async def notify_recording_available(webinar_id: int):
    async with SessionLocal() as db:
        stmt = select(Masterclass).where(Masterclass.masterclass_id == webinar_id)
        res = await db.execute(stmt)
        webinar = res.scalar_one_or_none()
        if not webinar:
            return
            
        user_stmt = select(User).where(User.is_active == True)
        user_res = await db.execute(user_stmt)
        users = user_res.scalars().all()
        
        for u in users:
            if u.pref_email_notifications and u.pref_recording_notifications:
                subject = f"Recording Available: {webinar.title}"
                body = generate_recording_email_body(webinar)
                await log_and_send_email(db, u, webinar, "recording_available", subject, body)
                
            if u.pref_recording_notifications:
                notif = Notification(
                    user_id=u.id,
                    title="Webinar Recording Ready",
                    message=f"The full session video for '{webinar.title}' is now available to stream.",
                    type="recording_available",
                    reference_id=str(webinar.masterclass_id)
                )
                db.add(notif)
        await db.commit()

# --- Endpoint Routes ---

@router.get("", response_model=List[MasterclassResponse])
async def list_masterclasses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Fetch masterclasses created by Masterclass.
    - Admins see all states (draft, private, public).
    - Standard users only see public or registered private ones, excluding drafts.
    """
    if current_user.role == "admin":
        stmt = select(Masterclass).where(Masterclass.source == "edustream").order_by(Masterclass.scheduled_at.desc())
    else:
        # Standard users see non-drafts and non-hidden
        stmt = select(Masterclass).where(
            Masterclass.source == "edustream",
            Masterclass.visibility != "draft",
            Masterclass.visibility != "hidden"
        ).order_by(Masterclass.scheduled_at.desc())
        
    res = await db.execute(stmt)
    items = res.scalars().all()
    for mc in items:
        await sign_masterclass_thumbnail(mc)
    return items

@router.post("", response_model=MasterclassResponse, status_code=status.HTTP_201_CREATED)
async def schedule_masterclass(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    speaker: Optional[str] = Form(None),
    scheduled_at: str = Form(...),
    duration_minutes: int = Form(...),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    learning_outcomes: Optional[str] = Form(None),
    max_attendees: Optional[int] = Form(None),
    visibility: str = Form("public"),
    send_notification: bool = Form(True),
    thumbnail: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Creates webinar via Zoom Webinar API, stores it locally, and queues emails.
    """
    try:
        dt_scheduled = datetime.fromisoformat(scheduled_at.replace("Z", ""))
        if dt_scheduled.tzinfo is None:
            dt_scheduled = dt_scheduled.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid scheduled_at date format. Use ISO format.")

    # Thumbnail upload to Supabase
    thumbnail_url = None
    if thumbnail and thumbnail.filename:
        file_content = await thumbnail.read()
        file_ext = thumbnail.filename.split(".")[-1] if "." in thumbnail.filename else "jpg"
        unique_filename = f"thumb_{uuid.uuid4().hex}.{file_ext}"
        storage_path = f"masterclasses/thumbnails/{unique_filename}"
        
        success, url, err_msg = await upload_file_to_supabase(
            file_bytes=file_content,
            file_path=storage_path,
            content_type=thumbnail.content_type or "image/jpeg"
        )
        if success:
            thumbnail_url = url
        else:
            print("Thumbnail upload to Supabase failed:", err_msg)

    # Zoom Business API Creation
    try:
        webinar_details = create_zoom_webinar(
            title=title,
            description=description,
            start_time=dt_scheduled,
            duration_minutes=duration_minutes
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create Zoom Webinar: {str(e)}"
        )

    # Database Store
    db_masterclass = Masterclass(
        title=title,
        description=description,
        speaker=speaker,
        scheduled_at=dt_scheduled,
        duration_minutes=duration_minutes,
        zoom_webinar_id=webinar_details["webinar_id"],
        zoom_join_url=webinar_details["join_url"],
        zoom_start_url=webinar_details["start_url"],
        status="upcoming",
        thumbnail_url=thumbnail_url,
        category=category,
        tags=tags,
        learning_outcomes=learning_outcomes,
        max_attendees=max_attendees,
        visibility=visibility,
        source="edustream"
    )
    db.add(db_masterclass)
    await db.commit()
    await db.refresh(db_masterclass)

    # Schedule notifications background task
    if send_notification:
        background_tasks.add_task(notify_webinar_scheduled, db_masterclass.masterclass_id)

    await sign_masterclass_thumbnail(db_masterclass)
    return db_masterclass

@router.get("/{masterclass_id}", response_model=MasterclassResponse)
async def get_masterclass_detail(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")
    await sign_masterclass_thumbnail(mc)
    return mc

@router.put("/{masterclass_id}", response_model=MasterclassResponse)
async def update_masterclass(
    masterclass_id: int,
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    speaker: Optional[str] = Form(None),
    scheduled_at: str = Form(...),
    duration_minutes: int = Form(...),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    learning_outcomes: Optional[str] = Form(None),
    max_attendees: Optional[int] = Form(None),
    visibility: str = Form("public"),
    send_notification: bool = Form(True),
    thumbnail: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")

    try:
        dt_scheduled = datetime.fromisoformat(scheduled_at.replace("Z", ""))
        if dt_scheduled.tzinfo is None:
            dt_scheduled = dt_scheduled.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid scheduled_at date format.")

    # Save original values for changes email comparison
    prev_data = {
        "title": mc.title,
        "description": mc.description,
        "scheduled_at": mc.scheduled_at,
        "duration_minutes": mc.duration_minutes,
        "speaker": mc.speaker
    }

    # Update on Zoom
    if mc.status not in ["completed", "recorded"] and mc.zoom_webinar_id:
        try:
            update_zoom_webinar(
                webinar_id=mc.zoom_webinar_id,
                title=title,
                description=description,
                start_time=dt_scheduled,
                duration_minutes=duration_minutes
            )
        except Exception as e:
            print("Zoom Webinar Update Error:", e)

    # Optional Thumbnail update
    thumbnail_url = mc.thumbnail_url
    if thumbnail and thumbnail.filename:
        file_content = await thumbnail.read()
        file_ext = thumbnail.filename.split(".")[-1] if "." in thumbnail.filename else "jpg"
        unique_filename = f"thumb_{uuid.uuid4().hex}.{file_ext}"
        storage_path = f"masterclasses/thumbnails/{unique_filename}"
        
        success, url, err_msg = await upload_file_to_supabase(
            file_bytes=file_content,
            file_path=storage_path,
            content_type=thumbnail.content_type or "image/jpeg"
        )
        if success:
            thumbnail_url = url

    # Update database model
    mc.title = title
    mc.description = description
    mc.speaker = speaker
    mc.scheduled_at = dt_scheduled
    mc.duration_minutes = duration_minutes
    mc.category = category
    mc.tags = tags
    mc.learning_outcomes = learning_outcomes
    mc.max_attendees = max_attendees
    mc.visibility = visibility
    mc.thumbnail_url = thumbnail_url

    await db.commit()
    await db.refresh(mc)

    # Trigger update notifications
    if mc.status not in ["completed", "recorded"] and send_notification:
        background_tasks.add_task(notify_webinar_updated, mc.masterclass_id, prev_data)

    await sign_masterclass_thumbnail(mc)
    return mc

@router.delete("/{masterclass_id}")
async def delete_masterclass(
    masterclass_id: int,
    background_tasks: BackgroundTasks,
    cancellation_message: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")

    if mc.status in ["completed", "recorded"]:
        await db.delete(mc)
        await db.commit()
        return {"detail": "Masterclass platform record deleted successfully."}

    # Delete on Zoom
    if mc.zoom_webinar_id:
        try:
            delete_zoom_webinar(mc.zoom_webinar_id)
        except Exception as e:
            print("Zoom Webinar Delete Error:", e)

    # Set status to cancelled to ensure queries omit it
    mc.status = "cancelled"
    await db.commit()

    # Trigger background tasks to send email and complete deletion
    background_tasks.add_task(send_cancellation_and_delete, masterclass_id, cancellation_message)

    return {"detail": "Masterclass cancellation initiated."}

@router.get("/{masterclass_id}/stream")
async def stream_recording(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Directly streams recording by redirecting user to Zoom Cloud Recording URL.
    """
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc or not mc.recording_url:
         raise HTTPException(status_code=404, detail="Streaming URL not found.")
    return RedirectResponse(mc.recording_url)

@router.post("/{masterclass_id}/register")
async def register_for_masterclass(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")

    reg_stmt = select(MasterclassRegistration).where(
        MasterclassRegistration.masterclass_id == masterclass_id,
        MasterclassRegistration.user_id == current_user.id
    )
    reg_res = await db.execute(reg_stmt)
    if reg_res.scalar_one_or_none():
        return {"detail": "Already registered for this masterclass."}

    new_reg = MasterclassRegistration(
        masterclass_id=masterclass_id,
        user_id=current_user.id
    )
    db.add(new_reg)
    await db.commit()
    return {"detail": "Registered successfully."}

@router.get("/{masterclass_id}/registrations")
async def get_masterclass_registrations(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(MasterclassRegistration).where(MasterclassRegistration.masterclass_id == masterclass_id)
    res = await db.execute(stmt)
    registrations = res.scalars().all()
    
    user_ids = [r.user_id for r in registrations]
    if not user_ids:
        return []
        
    user_stmt = select(User).where(User.id.in_(user_ids))
    user_res = await db.execute(user_stmt)
    users = user_res.scalars().all()
    
    return [{"user_id": u.id, "full_name": u.full_name, "email": u.email} for u in users]

@router.post("/{masterclass_id}/progress")
async def update_watch_progress(
    masterclass_id: int,
    payload: WatchProgressPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stmt = select(MasterclassWatchHistory).where(
        MasterclassWatchHistory.masterclass_id == masterclass_id,
        MasterclassWatchHistory.user_id == current_user.id
    )
    res = await db.execute(stmt)
    history = res.scalar_one_or_none()
    
    if history:
        history.last_position_seconds = payload.last_position_seconds
        history.max_position_seconds = max(history.max_position_seconds, payload.max_position_seconds)
        history.completion_percentage = max(history.completion_percentage, payload.completion_percentage)
    else:
        history = MasterclassWatchHistory(
            masterclass_id=masterclass_id,
            user_id=current_user.id,
            last_position_seconds=payload.last_position_seconds,
            max_position_seconds=payload.max_position_seconds,
            completion_percentage=payload.completion_percentage
        )
        db.add(history)
        
    await db.commit()
    return {"detail": "Watch progress updated."}

@router.get("/{masterclass_id}/progress")
async def get_watch_progress(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stmt = select(MasterclassWatchHistory).where(
        MasterclassWatchHistory.masterclass_id == masterclass_id,
        MasterclassWatchHistory.user_id == current_user.id
    )
    res = await db.execute(stmt)
    history = res.scalar_one_or_none()
    if not history:
        return {"last_position_seconds": 0.0, "max_position_seconds": 0.0, "completion_percentage": 0.0}
    return {
        "last_position_seconds": history.last_position_seconds,
        "max_position_seconds": history.max_position_seconds,
        "completion_percentage": history.completion_percentage
    }

@router.post("/{masterclass_id}/start")
async def start_masterclass(
    masterclass_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")
        
    now = datetime.now(timezone.utc)
    sch_at = mc.scheduled_at
    if sch_at.tzinfo is None:
        sch_at = sch_at.replace(tzinfo=timezone.utc)
        
    if now < sch_at - timedelta(minutes=1):
        raise HTTPException(
            status_code=400, 
            detail="Webinar cannot be started before the scheduled start time."
        )
        
    if mc.status in ["completed", "recorded"]:
        raise HTTPException(
            status_code=400,
            detail="Webinar has already completed."
        )
        
    if mc.status != "live":
        mc.status = "live"
        await db.commit()
        await db.refresh(mc)
        background_tasks.add_task(send_live_notifications_task, mc.masterclass_id)
        
    return {"start_url": mc.zoom_start_url}

@router.post("/{masterclass_id}/join")
async def join_masterclass(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")
        
    if current_user.role != "admin":
        reg_stmt = select(MasterclassRegistration).where(
            MasterclassRegistration.masterclass_id == masterclass_id,
            MasterclassRegistration.user_id == current_user.id
        )
        reg_res = await db.execute(reg_stmt)
        if not reg_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="You must register for this masterclass first.")
            
    if mc.status != "live":
        raise HTTPException(
            status_code=400,
            detail="Webinar has not started yet or has already ended."
        )
        
    return {"join_url": mc.zoom_join_url}

@router.post("/{masterclass_id}/end")
async def end_masterclass(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")
        
    if mc.status not in ["upcoming", "live"]:
        raise HTTPException(status_code=400, detail="Webinar is not in active state.")
        
    mc.status = "completed"
    await db.commit()
    await db.refresh(mc)
    return {"message": "Webinar ended successfully."}

@router.post("/{masterclass_id}/republish")
async def republish_masterclass(
    masterclass_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")
        
    if not mc.zoom_webinar_id:
        raise HTTPException(status_code=400, detail="Webinar does not have a Zoom Webinar ID.")
        
    try:
        recordings_data = get_zoom_webinar_recordings(mc.zoom_webinar_id)
    except Exception as e:
        raise HTTPException(
            status_code=502, 
            detail=f"Failed to fetch recordings from Zoom: {str(e)}"
        )
        
    if not recordings_data:
        raise HTTPException(
            status_code=400,
            detail="No cloud recording found for this webinar in Zoom yet."
        )
        
    share_url = recordings_data.get("share_url")
    recording_files = recordings_data.get("recording_files", [])
    
    recording_url = share_url
    for f in recording_files:
        if f.get("file_type", "").upper() == "MP4":
            recording_url = f.get("play_url") or f.get("download_url") or share_url
            break
            
    if not recording_url:
        raise HTTPException(
            status_code=400,
            detail="No MP4 files found in Zoom recording."
        )
        
    rec_stmt = select(MasterclassRecording).where(MasterclassRecording.masterclass_id == masterclass_id)
    rec_res = await db.execute(rec_stmt)
    recording_entry = rec_res.scalar_one_or_none()
    
    if not recording_entry:
        recording_entry = MasterclassRecording(
            masterclass_id=mc.masterclass_id,
            zoom_webinar_id=mc.zoom_webinar_id,
            recording_url=recording_url,
            duration_minutes=recordings_data.get("duration", mc.duration_minutes),
            thumbnail_url=mc.thumbnail_url,
            recording_date=datetime.now(timezone.utc)
        )
        db.add(recording_entry)
    else:
        recording_entry.recording_url = recording_url
        recording_entry.duration_minutes = recordings_data.get("duration", mc.duration_minutes)
        recording_entry.thumbnail_url = mc.thumbnail_url
        
    mc.status = "recorded"
    mc.recording_url = recording_url
    await db.commit()
    
    background_tasks.add_task(notify_recording_available, mc.masterclass_id)
    return {"message": "Recording republished successfully.", "recording_url": recording_url}

@router.post("/{masterclass_id}/hide")
async def hide_recording(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")
        
    mc.visibility = "hidden"
    await db.commit()
    await db.refresh(mc)
    await sign_masterclass_thumbnail(mc)
    return mc

@router.post("/{masterclass_id}/unhide")
async def unhide_recording(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")
        
    mc.visibility = "public"
    await db.commit()
    await db.refresh(mc)
    await sign_masterclass_thumbnail(mc)
    return mc

@router.post("/{masterclass_id}/unpublish")
async def unpublish_recording(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")
        
    mc.status = "completed"
    await db.commit()
    await db.refresh(mc)
    await sign_masterclass_thumbnail(mc)
    return mc

@router.post("/{masterclass_id}/publish")
async def publish_recording(
    masterclass_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(Masterclass).where(
        Masterclass.masterclass_id == masterclass_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    mc = res.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail="Masterclass not found.")
        
    mc.status = "recorded"
    await db.commit()
    await db.refresh(mc)
    await sign_masterclass_thumbnail(mc)
    return mc

async def send_live_notifications_task(masterclass_id: int):
    async with SessionLocal() as db:
        stmt = select(Masterclass).where(Masterclass.masterclass_id == masterclass_id)
        res = await db.execute(stmt)
        webinar = res.scalar_one_or_none()
        if not webinar:
            return
            
        user_stmt = select(User).where(User.is_active == True)
        user_res = await db.execute(user_stmt)
        users = user_res.scalars().all()
        
        for u in users:
            log_stmt = select(MasterclassEmailLog).where(
                MasterclassEmailLog.user_id == u.id,
                MasterclassEmailLog.webinar_id == masterclass_id,
                MasterclassEmailLog.email_type == "live"
            )
            log_res = await db.execute(log_stmt)
            if log_res.scalar_one_or_none():
                continue
                
            if u.pref_email_notifications and u.pref_masterclass_notifications:
                subject = f"Live Now: {webinar.title}"
                body = generate_live_email_body(webinar, u)
                await log_and_send_email(db, u, webinar, "live", subject, body)
                
            if u.pref_masterclass_notifications:
                notif = Notification(
                    user_id=u.id,
                    title="Webinar Live",
                    message=f"'{webinar.title}' is now Live. Join the session!",
                    type="webinar_live",
                    reference_id=str(webinar.masterclass_id)
                )
                db.add(notif)
        await db.commit()

# --- Zoom Webhook Receiver Endpoint ---

@zoom_router.post("/api/zoom/webhook")
async def zoom_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")
    
    timestamp = request.headers.get("x-zm-request-timestamp")
    signature = request.headers.get("x-zm-signature")
    webhook_secret = os.getenv("ZOOM_WEBHOOK_SECRET")
    
    try:
        data = json.loads(body_str) if body_str else {}
    except Exception as e:
        print(f"[ZOOM WEBHOOK ERROR] JSON parsing exception: {str(e)}")
        data = {}

    # Diagnostic Logging
    print("=== ZOOM WEBHOOK DIAGNOSTIC AUDIT ===")
    print("Request Headers:")
    for header_name, header_value in request.headers.items():
        # Hide authorization tokens or cookies for security if present
        if header_name.lower() in ("authorization", "cookie"):
            print(f"  {header_name}: [REDACTED]")
        else:
            print(f"  {header_name}: {header_value}")
    print(f"Raw Body content: {body_str}")
    print(f"Parsed JSON payload: {data}")
    print(f"ZOOM_WEBHOOK_SECRET is set: {bool(webhook_secret)}")
    print("=====================================")

    # 1. Challenge check (endpoint validation)
    if data.get("event") == "endpoint.url_validation":
        print("[ZOOM WEBHOOK] URL validation handshake request detected.")
        plain_token = data.get("payload", {}).get("plainToken", "")
        
        if webhook_secret:
            h = hmac.new(webhook_secret.encode("utf-8"), plain_token.encode("utf-8"), hashlib.sha256)
            encrypted_token = h.hexdigest()
            print(f"[ZOOM WEBHOOK] Generated validation hash. plainToken={plain_token}, encryptedToken={encrypted_token}")
            return {
                "plainToken": plain_token,
                "encryptedToken": encrypted_token
            }
        else:
            print("[WARNING][ZOOM WEBHOOK] ZOOM_WEBHOOK_SECRET is missing! Returning plainToken only.")
            return {"plainToken": plain_token}

    # 2. Check Signature
    print("[ZOOM WEBHOOK] Executing event signature verification...")
    if not timestamp or not signature or not webhook_secret:
        print(f"[ZOOM WEBHOOK ERROR] Verification elements missing. Timestamp={bool(timestamp)}, Signature={bool(signature)}, Secret={bool(webhook_secret)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing webhook signature validation headers."
        )
        
    message = f"v0:{timestamp}:{body_str}"
    h = hmac.new(webhook_secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256)
    expected_sig = f"v0={h.hexdigest()}"
    
    if signature != expected_sig:
        print(f"[ZOOM WEBHOOK ERROR] Signature mismatch. Received={signature}, Expected={expected_sig}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature."
        )
    print("[ZOOM WEBHOOK] Signature verified successfully.")

    event = data.get("event")
    payload = data.get("payload", {})
    webinar_obj = payload.get("object", {})
    zoom_webinar_id = str(webinar_obj.get("id"))
    
    # Verify webinar matches source edustream in database
    stmt = select(Masterclass).where(
        Masterclass.zoom_webinar_id == zoom_webinar_id,
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    webinar = res.scalar_one_or_none()
    
    if not webinar:
        # Ignore any webhook notifications for webinars created outside Masterclass
        return {"status": "ignored", "reason": "Not a Masterclass webinar"}

    if event == "recording.completed":
        duration = webinar_obj.get("duration", webinar.duration_minutes)
        share_url = webinar_obj.get("share_url")
        
        recording_files = webinar_obj.get("recording_files", [])
        recording_url = share_url
        for f in recording_files:
            if f.get("file_type", "").upper() == "MP4":
                recording_url = f.get("play_url") or f.get("download_url") or share_url
                break
                
        # Store in masterclass_recordings
        recording_entry = MasterclassRecording(
            masterclass_id=webinar.masterclass_id,
            zoom_webinar_id=zoom_webinar_id,
            recording_url=recording_url,
            duration_minutes=duration,
            thumbnail_url=webinar.thumbnail_url,
            recording_date=datetime.now(timezone.utc)
        )
        db.add(recording_entry)
        
        # Update Masterclass details
        webinar.status = "recorded"
        webinar.recording_url = recording_url
        await db.commit()
        
        # Send emails & in-app notifications
        asyncio.create_task(notify_recording_available(webinar.masterclass_id))
        
        return {"status": "success", "detail": "Recording saved"}
        
    elif event == "webinar.updated":
        topic = webinar_obj.get("topic")
        agenda = webinar_obj.get("agenda")
        start_time_str = webinar_obj.get("start_time")
        duration = webinar_obj.get("duration")
        
        if topic: webinar.title = topic
        if agenda: webinar.description = agenda
        if start_time_str:
            try:
                dt = datetime.fromisoformat(start_time_str.replace("Z", ""))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                webinar.scheduled_at = dt
            except Exception:
                pass
        if duration: webinar.duration_minutes = duration
        
        await db.commit()
        return {"status": "success", "detail": "Webinar updated"}
        
    elif event == "webinar.deleted":
        webinar.status = "cancelled"
        await db.commit()
        return {"status": "success", "detail": "Webinar marked cancelled"}
        
    return {"status": "ignored", "event": event}

# --- Automatic Reminders Background Scheduler ---

async def run_reminder_checks(db: AsyncSession):
    now = datetime.now(timezone.utc)
    
    # Query upcoming masterclasses
    stmt = select(Masterclass).where(
        Masterclass.status == "upcoming", 
        Masterclass.source == "edustream"
    )
    res = await db.execute(stmt)
    webinars = res.scalars().all()
    
    # Query active users
    user_stmt = select(User).where(User.is_active == True)
    user_res = await db.execute(user_stmt)
    users = user_res.scalars().all()
    
    for webinar in webinars:
        sch_at = webinar.scheduled_at
        if sch_at.tzinfo is None:
            sch_at = sch_at.replace(tzinfo=timezone.utc)
            
        time_diff = sch_at - now
        diff_seconds = time_diff.total_seconds()
        
        # 1. 15 Minutes Reminder (Starts in 10-15 minutes)
        if 600 <= diff_seconds <= 900:
            for u in users:
                if u.pref_email_notifications and u.pref_masterclass_notifications:
                    subject = f"Webinar Starting in 15m: {webinar.title}"
                    body = generate_reminder_email_body(webinar, u, "15 minutes")
                    await log_and_send_email(db, u, webinar, "reminder_15m", subject, body)
                    
                if u.pref_masterclass_notifications:
                    notif = Notification(
                        user_id=u.id,
                        title="Webinar Starting in 15m",
                        message=f"'{webinar.title}' starts in 15 minutes.",
                        type="webinar_reminder_15m",
                        reference_id=str(webinar.masterclass_id)
                    )
                    db.add(notif)
            await db.commit()
            
        # 3. 1 Hour Reminder (Starts in 50-60 minutes)
        elif 3000 <= diff_seconds <= 3600:
            for u in users:
                if u.pref_email_notifications and u.pref_masterclass_notifications:
                    subject = f"Webinar Starting in 1h: {webinar.title}"
                    body = generate_reminder_email_body(webinar, u, "1 hour")
                    await log_and_send_email(db, u, webinar, "reminder_1h", subject, body)
                    
                if u.pref_masterclass_notifications:
                    notif = Notification(
                        user_id=u.id,
                        title="Webinar Starting in 1h",
                        message=f"'{webinar.title}' starts in 1 hour.",
                        type="webinar_reminder_1h",
                        reference_id=str(webinar.masterclass_id)
                    )
                    db.add(notif)
            await db.commit()
            
        # 4. 24 Hours Reminder (Starts in 23h 50m to 24h 10m)
        elif 85800 <= diff_seconds <= 87000:
            for u in users:
                if u.pref_email_notifications and u.pref_masterclass_notifications:
                    subject = f"Reminder: Tomorrow's Masterclass - {webinar.title}"
                    body = generate_reminder_email_body(webinar, u, "24 hours")
                    await log_and_send_email(db, u, webinar, "reminder_24h", subject, body)
                    
                if u.pref_masterclass_notifications:
                    notif = Notification(
                        user_id=u.id,
                        title="Webinar Tomorrow",
                        message=f"Masterclass '{webinar.title}' starts tomorrow.",
                        type="webinar_reminder_24h",
                        reference_id=str(webinar.masterclass_id)
                    )
                    db.add(notif)
            await db.commit()

async def check_and_send_reminders_loop():
    """
    Indefinite loop that runs periodically to trigger upcoming webinar notifications.
    """
    while True:
        try:
            async with SessionLocal() as db:
                await run_reminder_checks(db)
        except Exception as e:
            print("Error in background reminder scheduler loop:", e)
        await asyncio.sleep(60)
