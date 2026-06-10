from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base

class Masterclass(Base):
    __tablename__ = "masterclasses"

    masterclass_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    speaker: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    zoom_webinar_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    zoom_join_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    zoom_start_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="upcoming", nullable=False) # upcoming, live, completed, recorded
    recording_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    recording_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True) # comma-separated tags
    learning_outcomes: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    max_attendees: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    visibility: Mapped[str] = mapped_column(String(50), default="public", nullable=False) # public, private, draft
    source: Mapped[str] = mapped_column(String(50), default="edustream", nullable=False) # MUST only be edustream
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )

class MasterclassRecording(Base):
    __tablename__ = "masterclass_recordings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    masterclass_id: Mapped[int] = mapped_column(ForeignKey("masterclasses.masterclass_id", ondelete="CASCADE"), nullable=False)
    zoom_webinar_id: Mapped[str] = mapped_column(String(255), nullable=False)
    recording_url: Mapped[str] = mapped_column(String(1000), nullable=False) # zoom cloud play/share URL
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    recording_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )

class MasterclassRegistration(Base):
    __tablename__ = "masterclass_registrations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    masterclass_id: Mapped[int] = mapped_column(ForeignKey("masterclasses.masterclass_id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )

class MasterclassWatchHistory(Base):
    __tablename__ = "masterclass_watch_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    masterclass_id: Mapped[int] = mapped_column(ForeignKey("masterclasses.masterclass_id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    last_position_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_position_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    completion_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

class MasterclassEmailLog(Base):
    __tablename__ = "masterclass_email_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    webinar_id: Mapped[int] = mapped_column(ForeignKey("masterclasses.masterclass_id", ondelete="CASCADE"), nullable=False)
    email_type: Mapped[str] = mapped_column(String(50), nullable=False) # scheduled, updated, cancelled, reminder_24h, reminder_1h, reminder_15m, live, recording_available
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="success", nullable=False)
