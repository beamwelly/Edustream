from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database.session import get_db
from app.models.user import User
from app.models.notification import Notification
from app.routes.content import get_current_active_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# --- Pydantic Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: Optional[int]
    title: str
    message: str
    type: str
    reference_id: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ReadNotificationsRequest(BaseModel):
    notification_ids: List[int]

# --- Endpoints ---

@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all notifications for the current active user.
    """
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    res = await db.execute(stmt)
    notifications = res.scalars().all()
    return notifications

@router.post("/read")
async def mark_notifications_as_read(
    payload: ReadNotificationsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Mark specified notifications as read.
    """
    if not payload.notification_ids:
        return {"detail": "No notifications specified."}
        
    stmt = (
        update(Notification)
        .where(Notification.id.in_(payload.notification_ids))
        .where(Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"detail": "Notifications marked as read."}

@router.post("/read-all")
async def mark_all_notifications_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Mark all notifications for current user as read.
    """
    stmt = (
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"detail": "All notifications marked as read."}
