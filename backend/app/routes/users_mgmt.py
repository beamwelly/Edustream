import re
import os
import io
import pandas as pd
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database.session import get_db
from app.models.user import User
from app.utils.security import decode_access_token
from app.services.user_mgmt_service import (
    create_standard_user,
    get_all_users_mgmt,
    process_bulk_upload_users,
    generate_random_password,
    hash_password,
    get_or_create_organization
)

router = APIRouter(prefix="/users", tags=["Users Management"])
security = HTTPBearer()

# Dependency to check if caller is system Admin (role = 'admin')
async def get_current_admin(
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
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user no longer exists."
        )
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires Admin privileges."
        )
    return user

# Schemas
class UserCreatePayload(BaseModel):
    full_name: str
    email: str
    company_name: str
    department: str
    designation: str
    is_active: bool = True
    role: str = "user"
    organization_id: Optional[int] = None

class UserUpdatePayload(BaseModel):
    full_name: str
    email: str
    company_name: str
    department: str
    designation: str
    role: str = "user"
    organization_id: Optional[int] = None

class UserStatusPayload(BaseModel):
    is_active: bool

class UserMgmtResponse(BaseModel):
    id: int
    full_name: str
    email: str
    company_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool
    role: str
    organization_id: Optional[int] = None

class OrganizationPayload(BaseModel):
    organization_name: str
    phone: Optional[str] = None
    website: Optional[str] = None
    number_of_employees: Optional[int] = None

class OrganizationResponse(BaseModel):
    id: int
    organization_name: str
    phone: Optional[str] = None
    website: Optional[str] = None
    number_of_employees: Optional[int] = None
    created_at: datetime

class EmployeePermissionPayload(BaseModel):
    access_dashboard: bool
    access_content_library: bool
    access_masterclasses: bool
    access_meetings: bool
    access_feedback: bool
    allowed_tools: List[str]
    allowed_content_categories: List[str]

class EmployeePermissionResponse(BaseModel):
    user_id: int
    access_dashboard: bool
    access_content_library: bool
    access_masterclasses: bool
    access_meetings: bool
    access_feedback: bool
    allowed_tools: List[str]
    allowed_content_categories: List[str]

class EmployeeAccessPolicyPayload(BaseModel):
    settings: dict

# --- Organization Endpoints ---

@router.get("/organizations", response_model=List[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from app.models.organization import Organization
    stmt = select(Organization).order_by(Organization.organization_name.asc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/organizations", response_model=OrganizationResponse)
async def create_organization(
    payload: OrganizationPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from app.models.organization import Organization
    stmt = select(Organization).where(func.lower(Organization.organization_name) == payload.organization_name.strip().lower())
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Organization '{payload.organization_name}' already exists.")
        
    org = Organization(
        organization_name=payload.organization_name.strip(),
        phone=payload.phone,
        website=payload.website,
        number_of_employees=payload.number_of_employees
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org

@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: int,
    payload: OrganizationPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from app.models.organization import Organization
    stmt = select(Organization).where(Organization.id == org_id)
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
        
    name_clean = payload.organization_name.strip()
    if org.organization_name.lower() != name_clean.lower():
        stmt_check = select(Organization).where(func.lower(Organization.organization_name) == name_clean.lower())
        res_check = await db.execute(stmt_check)
        if res_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Organization '{payload.organization_name}' already exists.")
            
    org.organization_name = name_clean
    org.phone = payload.phone
    org.website = payload.website
    org.number_of_employees = payload.number_of_employees
    await db.commit()
    await db.refresh(org)
    return org

@router.delete("/organizations/{org_id}")
async def delete_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from app.models.organization import Organization
    stmt = select(Organization).where(Organization.id == org_id)
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    await db.delete(org)
    await db.commit()
    return {"detail": "Organization deleted successfully."}

# --- Employee Permission Endpoints ---

@router.get("/{user_id}/permissions", response_model=EmployeePermissionResponse)
async def get_employee_permissions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt_user = select(User).where(User.id == user_id, User.role == "employee")
    res_user = await db.execute(stmt_user)
    user = res_user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User is not an employee.")
    return EmployeePermissionResponse(
        user_id=user_id,
        access_dashboard=True,
        access_content_library=True,
        access_masterclasses=True,
        access_meetings=True,
        access_feedback=True,
        allowed_tools=[],
        allowed_content_categories=[]
    )

@router.put("/{user_id}/permissions", response_model=EmployeePermissionResponse)
async def update_employee_permissions(
    user_id: int,
    payload: EmployeePermissionPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt_user = select(User).where(User.id == user_id, User.role == "employee")
    res_user = await db.execute(stmt_user)
    user = res_user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User is not an employee.")
    # Stube response - individual employee permission modifications are deprecated
    return EmployeePermissionResponse(
        user_id=user_id,
        access_dashboard=payload.access_dashboard,
        access_content_library=payload.access_content_library,
        access_masterclasses=payload.access_masterclasses,
        access_meetings=payload.access_meetings,
        access_feedback=payload.access_feedback,
        allowed_tools=payload.allowed_tools,
        allowed_content_categories=payload.allowed_content_categories
    )

# --- User Management Endpoints ---

@router.get("", response_model=List[UserMgmtResponse])
async def list_users(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    List all standard users, owners, and employees, with optional search filtering.
    """
    users = await get_all_users_mgmt(db, search_query=search)
    return [
        UserMgmtResponse(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            company_name=u.company_name,
            department=u.department,
            designation=u.designation,
            is_active=u.is_active,
            role=u.role,
            organization_id=u.organization_id
        ) for u in users
    ]

async def check_organization_has_owner(db: AsyncSession, organization_id: int) -> bool:
    if not organization_id:
        return False
    stmt = select(func.count(User.id)).where(
        User.organization_id == organization_id,
        User.role.in_(["owner", "user"]),
        User.is_active == True
    )
    res = await db.execute(stmt)
    return res.scalar_one() > 0

@router.post("/create", response_model=UserMgmtResponse)
async def create_user(
    payload: UserCreatePayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Creates a new user, generates a temporary password, and emails onboarding credentials.
    """
    if payload.role == "employee":
        if not payload.organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee must belong to a company."
            )
        # Check if company has an owner
        has_owner = await check_organization_has_owner(db, payload.organization_id)
        if not has_owner:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please create an Owner account first."
            )

    try:
        new_user = await create_standard_user(
            db=db,
            full_name=payload.full_name,
            email=payload.email,
            company_name=payload.company_name,
            department=payload.department,
            designation=payload.designation,
            is_active=payload.is_active,
            role=payload.role,
            organization_id=payload.organization_id
        )
        return UserMgmtResponse(
            id=new_user.id,
            full_name=new_user.full_name,
            email=new_user.email,
            company_name=new_user.company_name,
            department=new_user.department,
            designation=new_user.designation,
            is_active=new_user.is_active,
            role=new_user.role,
            organization_id=new_user.organization_id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/{user_id}/update", response_model=UserMgmtResponse)
async def update_user(
    user_id: int,
    payload: UserUpdatePayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Updates details for a user (including role and organization).
    """
    stmt = select(User).where(User.id == user_id, User.role != "admin")
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    org_id = payload.organization_id
    if payload.role in ["owner", "user"]:
        if not org_id and payload.company_name.strip():
            org_id = await get_or_create_organization(db, payload.company_name)

    if payload.role == "employee":
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee must belong to a company."
            )
        has_owner = await check_organization_has_owner(db, org_id)
        if not has_owner:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please create an Owner account first."
            )

    # Check email conflict
    email_clean = payload.email.strip().lower()
    if user.email.lower() != email_clean:
        stmt_check = select(User).where(func.lower(User.email) == email_clean)
        res_check = await db.execute(stmt_check)
        if res_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Email address '{payload.email}' is already taken.")

    # Resolve organization name if ID is provided
    company_name_resolved = payload.company_name.strip()
    if org_id:
        from app.models.organization import Organization
        org = await db.get(Organization, org_id)
        if org:
            company_name_resolved = org.organization_name

    old_role = user.role
    user.full_name = payload.full_name.strip()
    user.email = email_clean
    user.company_name = company_name_resolved
    user.department = payload.department.strip()
    user.designation = payload.designation.strip()
    user.role = payload.role
    user.organization_id = org_id
    # Handle employee permissions setup or cleanup (removed user-specific permissions check under RBAC model)
    await db.commit()
    await db.refresh(user)

    return UserMgmtResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        company_name=user.company_name,
        department=user.department,
        designation=user.designation,
        is_active=user.is_active,
        role=user.role,
        organization_id=user.organization_id
    )

@router.put("/{user_id}/status", response_model=UserMgmtResponse)
async def update_user_status(
    user_id: int,
    payload: UserStatusPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Toggles the active status of a user.
    """
    stmt = select(User).where(User.id == user_id, User.role != "admin")
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)

    return UserMgmtResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        company_name=user.company_name,
        department=user.department,
        designation=user.designation,
        is_active=user.is_active,
        role=user.role,
        organization_id=user.organization_id
    )

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Permanently deletes a user from the system.
    """
    stmt = select(User).where(User.id == user_id, User.role != "admin")
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    await db.delete(user)
    await db.commit()
    return {"detail": "User deleted successfully."}

@router.post("/bulk-upload")
async def bulk_upload_users(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Bulk registers users from an uploaded Excel or CSV file.
    """
    content = await file.read()
    result = await process_bulk_upload_users(db, content, file.filename)
    return result

from fastapi import Request

@router.get("/template-download")
async def download_template(
    request: Request,
    admin: User = Depends(get_current_admin)
):
    """
    Generates and downloads the bulk upload template Excel file.
    """
    df = pd.DataFrame(columns=["Name", "Email", "Company Name", "Department", "Designation", "Role"])
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    temp_dir = os.path.join(base_dir, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    filepath = os.path.join(temp_dir, "users_template.xlsx")
    
    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Users Template")
        
    origin = request.headers.get("origin") or os.getenv("FRONTEND_URL", "http://localhost:8081")
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Disposition": 'attachment; filename="users_template.xlsx"'
    }
    
    return FileResponse(
        filepath,
        headers=headers,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@router.get("/employee-access-policy", response_model=dict)
async def get_employee_access_policy(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from app.models.employee_access_policy import EmployeeAccessPolicy
    stmt = select(EmployeeAccessPolicy).where(EmployeeAccessPolicy.id == 1)
    res = await db.execute(stmt)
    policy = res.scalar_one_or_none()
    if not policy:
        return {
            "id": 1,
            "settings": {
                "dashboard": True,
                "content_library": True,
                "masterclasses": True,
                "meetings": False,
                "feedback": True,
                "wow_toolkit": True,
                "retirement_predictor": True,
                "financial_freedom": True,
                "family_vault": True,
                "goal_visualization": True,
                "cost_of_delay": True,
                "sip_home_loan": True
            },
            "updated_by": "system",
            "updated_at": datetime.utcnow()
        }
    return {
        "id": policy.id,
        "settings": policy.settings_json,
        "updated_by": policy.updated_by,
        "updated_at": policy.updated_at
    }

@router.put("/employee-access-policy", response_model=dict)
async def update_employee_access_policy(
    payload: EmployeeAccessPolicyPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from app.models.employee_access_policy import EmployeeAccessPolicy
    stmt = select(EmployeeAccessPolicy).where(EmployeeAccessPolicy.id == 1)
    res = await db.execute(stmt)
    policy = res.scalar_one_or_none()
    if not policy:
        policy = EmployeeAccessPolicy(
            id=1,
            settings_json=payload.settings,
            updated_by=admin.email
        )
        db.add(policy)
    else:
        policy.settings_json = payload.settings
        policy.updated_by = admin.email
        policy.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(policy)
    return {
        "id": policy.id,
        "settings": policy.settings_json,
        "updated_by": policy.updated_by,
        "updated_at": policy.updated_at
    }
