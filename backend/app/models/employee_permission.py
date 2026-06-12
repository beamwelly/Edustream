from typing import List
from sqlalchemy import Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref

from app.database.base import Base

class EmployeePermission(Base):
    __tablename__ = "employee_permissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        unique=True, 
        nullable=False
    )
    
    access_dashboard: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    access_content_library: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    access_masterclasses: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    access_meetings: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    access_feedback: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    allowed_tools: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    allowed_content_categories: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # Bidirectional relationship with cascade
    user: Mapped["User"] = relationship(
        "User", 
        backref=backref(
            "employee_permissions", 
            uselist=False, 
            cascade="all, delete-orphan", 
            passive_deletes=True
        )
    )
