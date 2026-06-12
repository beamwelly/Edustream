from datetime import datetime
from sqlalchemy import String, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base

class EmployeeAccessPolicy(Base):
    __tablename__ = "employee_access_policy"

    id: Mapped[int] = mapped_column(primary_key=True)
    settings_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_by: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
