import re
import os
import io
import pandas as pd
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
    hash_password
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

class UserUpdatePayload(BaseModel):
    full_name: str
    email: str
    company_name: str
    department: str
    designation: str

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

@router.get("", response_model=List[UserMgmtResponse])
async def list_users(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    List all standard users in the system, with optional search filtering.
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
            role=u.role
        ) for u in users
    ]

@router.post("/create", response_model=UserMgmtResponse)
async def create_user(
    payload: UserCreatePayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Creates a new user, generates a temporary password, and emails them onboarding credentials.
    """
    try:
        new_user = await create_standard_user(
            db=db,
            full_name=payload.full_name,
            email=payload.email,
            company_name=payload.company_name,
            department=payload.department,
            designation=payload.designation,
            is_active=payload.is_active
        )
        return UserMgmtResponse(
            id=new_user.id,
            full_name=new_user.full_name,
            email=new_user.email,
            company_name=new_user.company_name,
            department=new_user.department,
            designation=new_user.designation,
            is_active=new_user.is_active,
            role=new_user.role
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
    Updates details for a user.
    """
    stmt = select(User).where(User.id == user_id, User.role == "user")
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Check email conflict
    email_clean = payload.email.strip().lower()
    if user.email.lower() != email_clean:
        stmt_check = select(User).where(func.lower(User.email) == email_clean)
        res_check = await db.execute(stmt_check)
        if res_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Email address '{payload.email}' is already taken.")

    user.full_name = payload.full_name.strip()
    user.email = email_clean
    user.company_name = payload.company_name.strip()
    user.department = payload.department.strip()
    user.designation = payload.designation.strip()

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
        role=user.role
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
    stmt = select(User).where(User.id == user_id, User.role == "user")
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
        role=user.role
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
    stmt = select(User).where(User.id == user_id, User.role == "user")
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
    df = pd.DataFrame(columns=["Name", "Email", "Company Name", "Department", "Designation"])
    
    # Save the dataframe to a local file in workspace
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
