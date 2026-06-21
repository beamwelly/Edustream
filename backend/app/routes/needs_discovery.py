from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.models.user import User
from app.routes.users import require_tool_permission
from app.models.needs_discovery import NeedsDiscoveryProfile
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/needs-discovery", tags=["Needs Discovery"])

class NeedsDiscoverySavePayload(BaseModel):
    client_discovery_json: Optional[dict] = None
    risk_calculator_json: Optional[dict] = None
    suitability_check_json: Optional[dict] = None
    dashboard_json: Optional[dict] = None

@router.get("")
async def get_needs_discovery_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_tool_permission("needs_discovery"))
):
    stmt = select(NeedsDiscoveryProfile).where(NeedsDiscoveryProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record:
        return {
            "client_discovery_json": {},
            "risk_calculator_json": {},
            "suitability_check_json": {},
            "dashboard_json": {}
        }
        
    return {
        "client_discovery_json": record.client_discovery_json or {},
        "risk_calculator_json": record.risk_calculator_json or {},
        "suitability_check_json": record.suitability_check_json or {},
        "dashboard_json": record.dashboard_json or {}
    }

@router.put("")
async def save_needs_discovery_data(
    payload: NeedsDiscoverySavePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_tool_permission("needs_discovery"))
):
    stmt = select(NeedsDiscoveryProfile).where(NeedsDiscoveryProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record:
        record = NeedsDiscoveryProfile(
            user_id=current_user.id,
            organization_id=getattr(current_user, "organization_id", None),
            client_discovery_json=payload.client_discovery_json or {},
            risk_calculator_json=payload.risk_calculator_json or {},
            suitability_check_json=payload.suitability_check_json or {},
            dashboard_json=payload.dashboard_json or {}
        )
        db.add(record)
    else:
        if payload.client_discovery_json is not None:
            record.client_discovery_json = payload.client_discovery_json
        if payload.risk_calculator_json is not None:
            record.risk_calculator_json = payload.risk_calculator_json
        if payload.suitability_check_json is not None:
            record.suitability_check_json = payload.suitability_check_json
        if payload.dashboard_json is not None:
            record.dashboard_json = payload.dashboard_json
            
    await db.commit()
    return {"status": "success", "message": "Data saved successfully"}

@router.post("/reset")
async def reset_needs_discovery_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_tool_permission("needs_discovery"))
):
    stmt = select(NeedsDiscoveryProfile).where(NeedsDiscoveryProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if record:
        await db.delete(record)
        await db.commit()
        
    return {"status": "success", "message": "Data reset successfully"}
