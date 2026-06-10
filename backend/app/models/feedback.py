from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base

class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False
    )
    feedback_type: Mapped[str] = mapped_column(String(100), nullable=False) # Masterclass, Meeting, Recorded Session, Platform Feedback
    session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    session_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False) # 1 to 5
    category: Mapped[str] = mapped_column(String(100), nullable=False) # Content Quality, Trainer Quality, Technical Experience, Platform Experience, Suggestions, Other
    comment: Mapped[str] = mapped_column(String(2000), nullable=False)
    would_recommend: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Submitted", nullable=False) # Submitted, Reviewed, Resolved
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
