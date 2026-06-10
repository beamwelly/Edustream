from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.database.session import get_db
from app.models.user import User
from app.models.feedback import Feedback
from app.routes.content import get_current_active_user
from app.routes.users_mgmt import get_current_admin
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

# --- Pydantic Schemas ---
class FeedbackCreate(BaseModel):
    feedback_type: str
    session_id: Optional[str] = None
    session_title: Optional[str] = None
    rating: int
    category: str
    comment: str
    would_recommend: bool

class FeedbackResponse(BaseModel):
    id: int
    user_id: int
    feedback_type: str
    session_id: Optional[str] = None
    session_title: Optional[str] = None
    rating: int
    category: str
    comment: str
    would_recommend: bool
    status: str
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

class FeedbackStatusUpdate(BaseModel):
    status: str

# --- Endpoints ---

@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Submit feedback. Triggers an admin notification.
    """
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")

    fb = Feedback(
        user_id=current_user.id,
        feedback_type=payload.feedback_type,
        session_id=payload.session_id,
        session_title=payload.session_title,
        rating=payload.rating,
        category=payload.category,
        comment=payload.comment,
        would_recommend=payload.would_recommend,
        status="Submitted"
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)

    # Trigger admin notification
    user_display = current_user.full_name or current_user.email
    notif_msg = f"{user_display} submitted new feedback for {payload.feedback_type}."
    await create_notification(
        db=db,
        title="New Feedback Received",
        message=notif_msg,
        type="feedback_submitted",
        reference_id=str(fb.id),
        target_group="admins"
    )

    # Prepare response
    res = FeedbackResponse.from_orm(fb)
    res.user_name = current_user.full_name
    return res

@router.get("/my", response_model=List[FeedbackResponse])
async def get_my_feedback(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user's feedback history.
    """
    stmt = select(Feedback).where(Feedback.user_id == current_user.id).order_by(Feedback.created_at.desc())
    res = await db.execute(stmt)
    feedbacks = res.scalars().all()
    
    responses = []
    for fb in feedbacks:
        resp = FeedbackResponse.from_orm(fb)
        resp.user_name = current_user.full_name
        responses.append(resp)
        
    return responses

@router.get("", response_model=List[FeedbackResponse])
async def list_all_feedback(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Admin only: View all feedback with user details.
    """
    # Join with User table to get names
    stmt = (
        select(Feedback, User.full_name, User.email)
        .join(User, Feedback.user_id == User.id)
        .order_by(Feedback.created_at.desc())
    )
    res = await db.execute(stmt)
    results = res.all()
    
    responses = []
    for fb, full_name, email in results:
        resp = FeedbackResponse.from_orm(fb)
        resp.user_name = full_name or email
        responses.append(resp)
        
    return responses

@router.put("/{feedback_id}/status", response_model=FeedbackResponse)
async def update_feedback_status(
    feedback_id: int,
    payload: FeedbackStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Admin only: Mark feedback as Reviewed or Resolved.
    """
    stmt = select(Feedback).where(Feedback.id == feedback_id)
    res = await db.execute(stmt)
    fb = res.scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found.")
        
    fb.status = payload.status
    await db.commit()
    await db.refresh(fb)
    
    resp = FeedbackResponse.from_orm(fb)
    # Get user name for response
    user_stmt = select(User.full_name, User.email).where(User.id == fb.user_id)
    u_res = await db.execute(user_stmt)
    user_info = u_res.first()
    if user_info:
        resp.user_name = user_info[0] or user_info[1]
        
    return resp
