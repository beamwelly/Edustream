from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.models.user import User
from app.routes.users import require_tool_permission
from app.models.financial_discovery import FinancialDiscoveryProfile
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/financial-discovery", tags=["Financial Discovery"])

class DiscoverySavePayload(BaseModel):
    client_master_json: Optional[dict] = None
    assets_json: Optional[dict] = None
    liabilities_json: Optional[dict] = None
    insurance_json: Optional[dict] = None
    goals_json: Optional[dict] = None
    advisor_json: Optional[dict] = None

@router.get("")
async def get_discovery_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_tool_permission("financial_discovery"))
):
    stmt = select(FinancialDiscoveryProfile).where(FinancialDiscoveryProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record:
        return {
            "client_master_json": {},
            "assets_json": {},
            "liabilities_json": {},
            "insurance_json": {},
            "goals_json": {},
            "advisor_json": {}
        }
        
    return {
        "client_master_json": record.client_master_json or {},
        "assets_json": record.assets_json or {},
        "liabilities_json": record.liabilities_json or {},
        "insurance_json": record.insurance_json or {},
        "goals_json": record.goals_json or {},
        "advisor_json": record.advisor_json or {}
    }

@router.put("")
async def save_discovery_data(
    payload: DiscoverySavePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_tool_permission("financial_discovery"))
):
    stmt = select(FinancialDiscoveryProfile).where(FinancialDiscoveryProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record:
        record = FinancialDiscoveryProfile(
            user_id=current_user.id,
            organization_id=getattr(current_user, "organization_id", None),
            client_master_json=payload.client_master_json or {},
            assets_json=payload.assets_json or {},
            liabilities_json=payload.liabilities_json or {},
            insurance_json=payload.insurance_json or {},
            goals_json=payload.goals_json or {},
            advisor_json=payload.advisor_json or {}
        )
        db.add(record)
    else:
        if payload.client_master_json is not None:
            record.client_master_json = payload.client_master_json
        if payload.assets_json is not None:
            record.assets_json = payload.assets_json
        if payload.liabilities_json is not None:
            record.liabilities_json = payload.liabilities_json
        if payload.insurance_json is not None:
            record.insurance_json = payload.insurance_json
        if payload.goals_json is not None:
            record.goals_json = payload.goals_json
        if payload.advisor_json is not None:
            record.advisor_json = payload.advisor_json
            
    await db.commit()
    return {"status": "success", "message": "Data saved successfully"}

@router.post("/reset")
async def reset_discovery_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_tool_permission("financial_discovery"))
):
    stmt = select(FinancialDiscoveryProfile).where(FinancialDiscoveryProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if record:
        await db.delete(record)
        await db.commit()
        
    return {"status": "success", "message": "Data reset successfully"}
