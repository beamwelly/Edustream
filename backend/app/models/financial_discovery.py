from datetime import datetime
from sqlalchemy import Integer, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database.base import Base

class FinancialDiscoveryProfile(Base):
    __tablename__ = "financial_discovery_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    organization_id: Mapped[int] = mapped_column(Integer, nullable=True)
    
    client_master_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    assets_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    liabilities_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    insurance_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    goals_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    advisor_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    
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
