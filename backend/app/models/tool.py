from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base

class ToolRegistry(Base):
    __tablename__ = "tools_registry"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # "interactive", "downloadable"
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True) # Storage path or download URL
    original_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    storage_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_name: Mapped[str] = mapped_column(String(50), default="TrendingUp", nullable=False) # Lucide icon identifier
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
