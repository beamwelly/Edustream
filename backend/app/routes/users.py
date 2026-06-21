from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database.session import get_db
from app.models.user import User
from app.utils.security import decode_access_token
from app.utils.redis_cache import cache_get, cache_set
router = APIRouter(prefix="/users", tags=["Users Profile"])
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload credentials."
        )
    stmt = select(User).where(User.id == int(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with this session no longer exists."
        )
        
    return user

def require_permission(category: str):
    async def dependency(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> User:
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive."
            )
        if current_user.role in ("admin", "owner", "user"):
            return current_user
        if current_user.role == "employee":
            from app.models.employee_access_policy import EmployeeAccessPolicy
            stmt = select(EmployeeAccessPolicy).where(EmployeeAccessPolicy.id == 1)
            res = await db.execute(stmt)
            policy = res.scalar_one_or_none()
            if policy:
                settings = policy.settings_json or {}
                # Map standard category name to settings key if they differ slightly
                key = category
                if category == "content":
                    key = "content_library"
                
                if settings.get(key, False):
                    return current_user
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied. Global Employee Policy restricts access to {category}."
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied. You do not have permission to access {category}."
        )
    return dependency

def require_tool_permission(tool_id: str):
    async def dependency(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> User:
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive."
            )
        if current_user.role in ("admin", "owner", "user"):
            return current_user
        if current_user.role == "employee":
            from app.models.employee_access_policy import EmployeeAccessPolicy
            stmt = select(EmployeeAccessPolicy).where(EmployeeAccessPolicy.id == 1)
            res = await db.execute(stmt)
            policy = res.scalar_one_or_none()
            if policy:
                settings = policy.settings_json or {}
                # Map backend tool_id to policy settings
                # If tool_id is one of the calculators of WOW, gate it by wow_toolkit
                WOW_CALCULATORS = {"retirement_predictor", "financial_freedom", "family_vault", "goal_visualization", "cost_of_delay", "sip_home_loan", "wow_toolkit"}
                if tool_id in WOW_CALCULATORS:
                    if not settings.get("wow_toolkit", False):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access Denied. Global Employee Policy restricts access to WOW Toolkit."
                        )
                elif tool_id == "financial_discovery":
                    if not settings.get("financial_discovery", False):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access Denied. Global Employee Policy restricts access to Financial Discovery."
                        )
                elif tool_id == "needs_discovery":
                    if not settings.get("needs_discovery", False):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access Denied. Global Employee Policy restricts access to Needs Discovery."
                        )
                elif tool_id == "resource_downloads":
                    if not settings.get("resource_downloads", False):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access Denied. Global Employee Policy restricts access to Resource Downloads."
                        )
                elif tool_id == "future_tools":
                    if not settings.get("future_tools", False):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access Denied. Global Employee Policy restricts access to Future Tools."
                        )
                return current_user
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied. You do not have permission to access the tool: {tool_id}."
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied. You do not have permission to access the tool: {tool_id}."
        )
    return dependency


# Pydantic Schemas for Profile
class UserProfileResponseSchema(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    company_name: Optional[str] = None
    number_of_employees: Optional[int] = None
    department: Optional[str] = None
    years_of_experience: Optional[int] = None
    number_of_clients: Optional[int] = None
    aum: Optional[str] = None
    products_dealt_with: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool
    pref_masterclass_notifications: bool
    pref_email_notifications: bool
    pref_recording_notifications: bool
    permissions: Optional[dict] = None

class UserProfileUpdate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    department: Optional[str] = None
    years_of_experience: Optional[int] = None
    number_of_clients: Optional[int] = None
    aum: Optional[str] = None
    products_dealt_with: Optional[str] = None
    designation: Optional[str] = None
    pref_masterclass_notifications: Optional[bool] = None
    pref_email_notifications: Optional[bool] = None
    pref_recording_notifications: Optional[bool] = None

@router.get("/me", response_model=UserProfileResponseSchema)
async def get_current_user_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current logged-in user profile, with company_name mapped to organization_name.
    """
    user_perms = None
    if current_user.role == "employee":
        from app.models.employee_access_policy import EmployeeAccessPolicy
        stmt_policy = select(EmployeeAccessPolicy).where(EmployeeAccessPolicy.id == 1)
        res_policy = await db.execute(stmt_policy)
        policy = res_policy.scalar_one_or_none()
        settings = policy.settings_json if policy else {}
        user_perms = {
            "access_dashboard": settings.get("dashboard", True),
            "access_content": settings.get("content_library", True),
            "access_masterclasses": settings.get("masterclasses", True),
            "access_meetings": settings.get("meetings", False),
            "access_feedback": settings.get("feedback", True),
            "allowed_tools": [
                k for k in ("wow_toolkit", "financial_discovery", "needs_discovery", "resource_downloads", "future_tools", "retirement_predictor", "financial_freedom", "family_vault", "goal_visualization", "cost_of_delay", "sip_home_loan")
                if settings.get(k, False)
            ],
            "allowed_categories": []
        }
    else:
        user_perms = {
            "access_dashboard": True,
            "access_content": True,
            "access_masterclasses": True,
            "access_meetings": True,
            "access_feedback": True,
            "allowed_tools": [
                "wow_toolkit", "financial_discovery", "needs_discovery", "resource_downloads", "future_tools",
                "retirement_predictor", "financial_freedom", "family_vault", "goal_visualization",
                "cost_of_delay", "sip_home_loan"
            ],
            "allowed_categories": []
        }

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "phone": current_user.phone,
        "profile_photo": current_user.profile_photo,
        "organization_id": current_user.organization_id,
        "organization_name": current_user.company_name,
        "company_name": current_user.company_name,
        "number_of_employees": 0,
        "department": current_user.department,
        "years_of_experience": current_user.years_of_experience,
        "number_of_clients": current_user.number_of_clients,
        "aum": current_user.aum,
        "products_dealt_with": current_user.products_dealt_with,
        "designation": current_user.designation,
        "is_active": current_user.is_active,
        "pref_masterclass_notifications": current_user.pref_masterclass_notifications,
        "pref_email_notifications": current_user.pref_email_notifications,
        "pref_recording_notifications": current_user.pref_recording_notifications,
        "permissions": user_perms
    }

@router.put("/me", response_model=UserProfileResponseSchema)
async def update_current_user_profile(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the authenticated user's own profile parameters.
    """
    full_name_clean = payload.full_name.strip()
    if not full_name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee name cannot be empty."
        )

    current_user.full_name = full_name_clean
    if payload.phone is not None:
        current_user.phone = payload.phone.strip()
    if payload.profile_photo is not None:
        current_user.profile_photo = payload.profile_photo

    if payload.department is not None:
        current_user.department = payload.department.strip()
    if payload.years_of_experience is not None:
        if payload.years_of_experience < 0:
            raise HTTPException(status_code=400, detail="Years of experience cannot be negative.")
        current_user.years_of_experience = payload.years_of_experience
    if payload.number_of_clients is not None:
        if payload.number_of_clients < 0:
            raise HTTPException(status_code=400, detail="Number of clients cannot be negative.")
        current_user.number_of_clients = payload.number_of_clients
    if payload.aum is not None:
        current_user.aum = payload.aum.strip()
    if payload.products_dealt_with is not None:
        current_user.products_dealt_with = payload.products_dealt_with.strip()
    if payload.designation is not None:
        current_user.designation = payload.designation.strip()

    if payload.pref_masterclass_notifications is not None:
        current_user.pref_masterclass_notifications = payload.pref_masterclass_notifications
    if payload.pref_email_notifications is not None:
        current_user.pref_email_notifications = payload.pref_email_notifications
    if payload.pref_recording_notifications is not None:
        current_user.pref_recording_notifications = payload.pref_recording_notifications

    await db.commit()
    await db.refresh(current_user)

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "phone": current_user.phone,
        "profile_photo": current_user.profile_photo,
        "organization_id": current_user.organization_id,
        "organization_name": current_user.company_name,
        "company_name": current_user.company_name,
        "number_of_employees": 0,
        "department": current_user.department,
        "years_of_experience": current_user.years_of_experience,
        "number_of_clients": current_user.number_of_clients,
        "aum": current_user.aum,
        "products_dealt_with": current_user.products_dealt_with,
        "designation": current_user.designation,
        "is_active": current_user.is_active,
        "pref_masterclass_notifications": current_user.pref_masterclass_notifications,
        "pref_email_notifications": current_user.pref_email_notifications,
        "pref_recording_notifications": current_user.pref_recording_notifications
    }

@router.get("/super-dashboard-kpis")
async def get_super_dashboard_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires Admin permissions."
        )
        
    cached_kpis = cache_get("content:recent")
    if cached_kpis is not None:
        return cached_kpis

    from app.models.content import ContentItem
    from app.models.meeting import Meeting
    
    # 1. Total standard users
    user_count_stmt = select(func.count(User.id)).where(User.role.in_(["admin", "owner", "employee", "user"]))
    user_count_res = await db.execute(user_count_stmt)
    total_users = user_count_res.scalar_one()
    
    # 2. Total Uploaded Documents
    doc_count_stmt = select(func.count(ContentItem.id))
    doc_count_res = await db.execute(doc_count_stmt)
    total_documents = doc_count_res.scalar_one()
    
    # 3. Upcoming Meetings
    meetings_count_stmt = select(func.count(Meeting.id)).where(Meeting.status == "scheduled")
    meetings_count_res = await db.execute(meetings_count_stmt)
    upcoming_meetings = meetings_count_res.scalar_one()
    
    # 4. Recent Uploads count
    recent_uploads = total_documents
    
    # 5. Formulate dynamic activity list
    users_stmt = select(User).where(User.role.in_(["admin", "owner", "employee", "user"])).order_by(User.id.desc()).limit(2)
    users_res = await db.execute(users_stmt)
    recent_users = users_res.scalars().all()
    
    docs_stmt = select(ContentItem).order_by(ContentItem.id.desc()).limit(2)
    docs_res = await db.execute(docs_stmt)
    recent_docs = docs_res.scalars().all()
    
    recent_activities = []
    
    for u in recent_users:
        recent_activities.append({
            "title": f"{u.full_name} joined the network ({u.company_name or 'No Company'})",
            "time": "Recently",
            "tone": "primary",
            "tag": "New User"
        })
        
    for doc in recent_docs:
        doc_title = getattr(doc, "original_filename", None) or getattr(doc, "title", "Document")
        recent_activities.append({
            "title": f"{doc_title} uploaded to library",
            "time": "Recently",
            "tone": "success",
            "tag": "Upload"
        })
        
    if not recent_activities:
        recent_activities = [
            { "title": "Masterclass Workspace fully operational", "time": "Just now", "tone": "primary", "tag": "System" }
        ]
        
    recent_uploads_list = []
    for doc in recent_docs:
        recent_uploads_list.append({
            "name": doc.original_filename or doc.title,
            "size": doc.file_size or "Unknown",
            "type": doc.file_type.upper() if doc.file_type else "FILE"
        })
        
    if not recent_uploads_list:
        recent_uploads_list = [
            { "name": "No documents uploaded yet", "size": "0 KB", "type": "INFO" }
        ]
        
    res_data = {
        "total_organizations": total_users,
        "total_documents": total_documents,
        "upcoming_meetings": upcoming_meetings,
        "recent_uploads": recent_uploads,
        "activities": recent_activities,
        "recent_uploads_list": recent_uploads_list
    }
    
    cache_set("content:recent", res_data, ttl=300)
    return res_data
