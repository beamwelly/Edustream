import os
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base

class ContentCategory(Base):
    __tablename__ = "content_categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class ContentItem(Base):
    __tablename__ = "content_library"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[str] = mapped_column(String(50), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    public_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Added columns for storage tracking and consistency
    storage_provider: Mapped[Optional[str]] = mapped_column(String(100), default="Supabase", nullable=True)
    bucket_name: Mapped[Optional[str]] = mapped_column(String(255), default=lambda: os.getenv("SUPABASE_BUCKET", "edustream-content-library"), nullable=True)
    original_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    storage_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    warning: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    folder: Mapped[Optional[str]] = mapped_column(String(255), default="General", nullable=True)


