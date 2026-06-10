from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="user", nullable=False)  # admin, user
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    organization_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), 
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_temp_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )

    department: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    years_of_experience: Mapped[Optional[int]] = mapped_column(nullable=True)
    number_of_clients: Mapped[Optional[int]] = mapped_column(nullable=True)
    aum: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    products_dealt_with: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    profile_photo: Mapped[Optional[str]] = mapped_column(String(1000000), nullable=True)
    
    # Notification Preferences
    pref_masterclass_notifications: Mapped[bool] = mapped_column(Boolean, default=True, server_default='true')
    pref_email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, server_default='true')
    pref_recording_notifications: Mapped[bool] = mapped_column(Boolean, default=True, server_default='true')

    # Relationships
    # Using string references with typing.Optional to avoid circular import issues
    organization: Mapped[Optional["Organization"]] = relationship(
        "Organization", 
        back_populates="users"
    )
