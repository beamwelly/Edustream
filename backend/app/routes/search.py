from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional
from datetime import datetime, timedelta

from app.database.session import get_db
from app.models.user import User
from app.models.content import ContentItem
from app.models.masterclass import Masterclass
from app.models.tool import ToolRegistry
from app.utils.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/search", tags=["Global Search"])
security = HTTPBearer()

async def get_current_active_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token."
        )
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing required user identity claims."
        )
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with this session no longer exists."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )
    return user

@router.get("")
async def global_search(
    q: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    search_query = q.strip().lower()
    if not search_query:
        return []

    results = []
    is_admin = current_user.role == "admin"

    # 1. Search Users (Admin only)
    if is_admin:
        user_stmt = select(User).where(
            or_(
                func.lower(User.full_name).like(f"%{search_query}%"),
                func.lower(User.email).like(f"%{search_query}%"),
                func.lower(User.company_name).like(f"%{search_query}%")
            )
        )
        user_res = await db.execute(user_stmt)
        users = user_res.scalars().all()
        for u in users:
            results.append({
                "id": u.id,
                "type": "user",
                "title": u.full_name or u.email,
                "description": f"Role: {u.role.capitalize()} | Company: {u.company_name or 'Masterclass'}",
                "route": "/admin/users"
            })

    # 2. Search ContentItems
    content_stmt = select(ContentItem)
    if not is_admin:
        threshold = current_user.created_at - timedelta(days=30)
        content_stmt = content_stmt.where(
            func.coalesce(ContentItem.content_date, ContentItem.uploaded_at) >= threshold,
            ContentItem.is_active == True,
            ContentItem.visibility == "owner_employee"
        )
    content_stmt = content_stmt.where(
        or_(
            func.lower(ContentItem.title).like(f"%{search_query}%"),
            func.lower(ContentItem.description).like(f"%{search_query}%"),
            func.lower(ContentItem.category).like(f"%{search_query}%")
        )
    )
    content_res = await db.execute(content_stmt)
    contents = content_res.scalars().all()
    for c in contents:
        results.append({
            "id": c.id,
            "type": "content",
            "title": c.title,
            "description": c.description or f"Category: {c.category}",
            "route": "/admin/content" if is_admin else "/user/content"
        })

    # 3. Search Masterclasses
    mc_stmt = select(Masterclass)
    if not is_admin:
        threshold = current_user.created_at - timedelta(days=30)
        mc_stmt = mc_stmt.where(
            Masterclass.created_at >= threshold
        )
        # Note: standard user can access public masterclasses or ones they are registered for. 
        # But we align with the 30-day window.
    mc_stmt = mc_stmt.where(
        or_(
            func.lower(Masterclass.title).like(f"%{search_query}%"),
            func.lower(Masterclass.description).like(f"%{search_query}%"),
            func.lower(Masterclass.speaker).like(f"%{search_query}%"),
            func.lower(Masterclass.category).like(f"%{search_query}%")
        )
    )
    mc_res = await db.execute(mc_stmt)
    masterclasses = mc_res.scalars().all()
    for mc in masterclasses:
        results.append({
            "id": mc.masterclass_id,
            "type": "masterclass",
            "title": mc.title,
            "description": f"Speaker: {mc.speaker or 'N/A'} | {mc.description or ''}",
            "route": "/admin/masterclasses" if is_admin else "/user/masterclasses"
        })

    # 4. Search Tools
    tool_stmt = select(ToolRegistry).where(
        or_(
            func.lower(ToolRegistry.name).like(f"%{search_query}%"),
            func.lower(ToolRegistry.description).like(f"%{search_query}%")
        )
    )
    tool_res = await db.execute(tool_stmt)
    tools = tool_res.scalars().all()

    # Filter tools based on employee/owner policy if not admin
    filtered_tools = []
    if is_admin:
        filtered_tools = list(tools)
    else:
        policy_settings = {}
        if current_user.role == "employee":
            from app.models.employee_access_policy import EmployeeAccessPolicy
            policy_stmt = select(EmployeeAccessPolicy).where(EmployeeAccessPolicy.id == 1)
            policy_res = await db.execute(policy_stmt)
            policy = policy_res.scalar_one_or_none()
            policy_settings = policy.settings_json if policy else {}

        for t in tools:
            if not t.is_active:
                continue
            if current_user.role == "employee":
                if getattr(t, "visibility", "owner_only") == "owner_only":
                    continue
                tool_name = t.name.lower() if t.name else ""
                if t.type == "downloadable":
                    if not policy_settings.get("resource_downloads", False):
                        continue
                else:
                    if ("wow" in tool_name or "retirement" in tool_name) and not policy_settings.get("wow_toolkit", False):
                        continue
                    elif "needs discovery" in tool_name and not policy_settings.get("needs_discovery", False):
                        continue
                    elif "discovery" in tool_name and "needs discovery" not in tool_name and not policy_settings.get("financial_discovery", False):
                        continue
                    else:
                        if not ("wow" in tool_name or "retirement" in tool_name or "needs discovery" in tool_name or "discovery" in tool_name):
                            if not policy_settings.get("future_tools", False):
                                continue
            filtered_tools.append(t)

    for t in filtered_tools:
        results.append({
            "id": t.id,
            "type": "tool",
            "title": t.name,
            "description": t.description,
            "route": "/admin/tools" if is_admin else "/user/tools"
        })

    return results
