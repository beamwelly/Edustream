import re
import secrets
import string
import io
import os
import pandas as pd
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from app.models.user import User
from app.services.email_service import send_email_async
import bcrypt

# Helper regex for standard email validation
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def generate_random_password(length: int = 10) -> str:
    """
    Generates a secure, random temporary password.
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))

def hash_password(password: str) -> str:
    """
    Utility to hash plain text passwords using raw bcrypt to prevent passlib version bugs.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

async def get_or_create_organization(db: AsyncSession, org_name: str) -> int:
    from app.models.organization import Organization
    name_clean = org_name.strip()
    stmt = select(Organization).where(func.lower(Organization.organization_name) == name_clean.lower())
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()
    if not org:
        org = Organization(organization_name=name_clean)
        db.add(org)
        await db.flush()
    return org.id

async def create_standard_user(
    db: AsyncSession,
    full_name: str,
    email: str,
    company_name: str,
    department: str,
    designation: str,
    is_active: bool = True,
    role: str = "user",
    organization_id: Optional[int] = None
) -> User:
    """
    Registers a new User (role can be 'user', 'owner', or 'employee').
    Dispatches a professional SMTP email with temporary credentials and new branding.
    """
    full_name_clean = full_name.strip()
    email_clean = email.strip().lower()
    company_name_clean = company_name.strip()
    department_clean = department.strip()
    designation_clean = designation.strip()

    # Validate email format
    if not EMAIL_REGEX.match(email_clean):
        raise ValueError(f"Invalid email format: '{email}'.")

    # Validate admin email uniqueness
    stmt_user = select(User).where(func.lower(User.email) == email_clean.lower())
    result_user = await db.execute(stmt_user)
    if result_user.scalar_one_or_none():
        raise ValueError(f"Email address '{email_clean}' is already registered.")

    # Resolve or create organization for Owner / User roles if organization_id is not provided
    if role in ["owner", "user"]:
        if not organization_id and company_name_clean:
            organization_id = await get_or_create_organization(db, company_name_clean)

    # Resolve organization name if id is given
    if organization_id:
        from app.models.organization import Organization
        org_res = await db.execute(select(Organization).where(Organization.id == organization_id))
        org = org_res.scalar_one_or_none()
        if org:
            company_name_clean = org.organization_name

    # Generate temporary password
    temp_password = generate_random_password()
    hashed = hash_password(temp_password)

    # Create User record
    new_user = User(
        full_name=full_name_clean,
        email=email_clean,
        hashed_password=hashed,
        role=role,
        company_name=company_name_clean,
        department=department_clean,
        designation=designation_clean,
        is_active=is_active,
        is_temp_password=True,
        organization_id=organization_id
    )
    db.add(new_user)
    await db.flush()

    # Create permissions if role is employee - REMOVED under new centralized access architecture
    pass

    # Assemble HTML Email content (using the new red #E53935 branding)
    email_subject = "Welcome to Masterclass - Onboarding Credentials"
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8081")
    login_url = f"{frontend_url}/login"
    
    role_display = role.capitalize()
    
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1a202c;">
         <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; padding: 10px 20px; background-color: #E53935; color: #ffffff; font-weight: bold; font-size: 24px; border-radius: 8px;">
                   M
              </div>
              <h2 style="color: #E53935; margin-top: 10px; font-size: 20px; font-weight: 600;">Welcome to Masterclass!</h2>
         </div>
         
         <p>Hello <strong>{full_name_clean}</strong>,</p>
         <p>You have been added as a {role_display} under: <strong>{company_name_clean}</strong> on the <strong>Masterclass Learning & Content Platform</strong>.</p>
         <p>Below are your secure temporary credentials:</p>
         
         <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Portal Login URL:</strong> <a href="{login_url}" style="color: #E53935; text-decoration: underline;">{login_url}</a></p>
              <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Email:</strong> <span style="font-family: monospace; font-size: 15px; color: #0f172a;">{email_clean}</span></p>
              <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 15px; color: #0f172a; font-weight: bold;">{temp_password}</code></p>
              <p style="margin: 0; font-size: 14px;"><strong>Assigned Role:</strong> <span style="color: #4B5563; font-weight: 600;">{role_display}</span></p>
         </div>
        
         <div style="color: #dc2626; font-size: 13px; font-weight: bold; background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fee2e2; border-left: 5px solid #dc2626; margin: 20px 0;">
             ⚠️ IMPORTANT SECURITY POLICY:<br/>
             • There is NO "Forgot Password" or password recovery feature on this platform.<br/>
             • These credentials are generated and sent EXACTLY ONCE.<br/>
             • These credentials will be your permanent login credentials. You must store and keep this password completely secure for all future portal sessions.
         </div>
         
         <p style="margin-top: 25px;">Should you have any questions or require custom setup help, please do not hesitate to contact our platform assistance team.</p>
         <p style="margin-bottom: 0;">Warm regards,<br/><strong>The Masterclass Team</strong></p>
         
         <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
         <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
    </div>
    """

    try:
        await send_email_async(
            recipient_email=email_clean,
            subject=email_subject,
            body=email_body,
            is_html=True
        )
    except Exception as email_err:
        await db.rollback()
        raise ValueError(f"Failed to dispatch activation credentials email: {str(email_err)}. DB state rolled back.")

    await db.commit()
    await db.refresh(new_user)

    return new_user

async def get_all_users_mgmt(db: AsyncSession, search_query: Optional[str] = None) -> List[User]:
    """
    Retrieves all users except system admins.
    Allows searching by name, email, company_name, department, designation, and role.
    """
    stmt = select(User).where(User.role != "admin").order_by(User.created_at.desc())
    
    res = await db.execute(stmt)
    users = res.scalars().all()
    
    if search_query:
        sq = search_query.strip().lower()
        filtered = []
        for u in users:
            name_match = sq in (u.full_name or "").lower()
            email_match = sq in (u.email or "").lower()
            comp_match = sq in (u.company_name or "").lower()
            dept_match = sq in (u.department or "").lower()
            des_match = sq in (u.designation or "").lower()
            role_match = sq in (u.role or "").lower()
            if name_match or email_match or comp_match or dept_match or des_match or role_match:
                filtered.append(u)
        return filtered
        
    return list(users)

async def process_bulk_upload_users(db: AsyncSession, file_content: bytes, file_name: str) -> Dict[str, Any]:
    """
    Processes a bulk user spreadsheet (CSV or Excel) using Pandas.
    Executes transaction creation, formats errors, and validates duplicate rows.
    """
    try:
        if file_name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_content))
        elif file_name.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            return {
                "success_count": 0,
                "failed_count": 0,
                "errors": [{"row": "File", "error": "Unsupported file format. Please upload CSV or XLSX."}]
            }
    except Exception as e:
        return {
            "success_count": 0,
            "failed_count": 0,
            "errors": [{"row": "File", "error": f"Failed to parse file: {str(e)}"}]
        }

    # Clean columns
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]
    
    # Map raw headers
    header_mapping = {
        "name": "full_name",
        "email": "email",
        "company_name": "company_name",
        "company": "company_name",
        "department": "department",
        "designation": "designation",
        "role": "role",
        "organization_id": "organization_id",
        "organization": "organization_id"
    }
    
    normalized_cols = {}
    for col in df.columns:
        for k, v in header_mapping.items():
            if col == k or col.replace("_", "") == k.replace("_", ""):
                normalized_cols[col] = v

    df = df.rename(columns=normalized_cols)
    
    required_cols = ["full_name", "email", "company_name", "department", "designation"]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        return {
            "success_count": 0,
            "failed_count": 0,
            "errors": [{"row": "Header", "error": f"Missing required columns (or columns could not be mapped): {', '.join(missing_cols)}"}]
        }

    success_count = 0
    failed_count = 0
    errors = []
    uploaded_emails = set()

    for idx, row in df.iterrows():
        row_num = idx + 2
        name = str(row.get("full_name", "")).strip()
        email = str(row.get("email", "")).strip()
        company = str(row.get("company_name", "")).strip()
        dept = str(row.get("department", "")).strip()
        desig = str(row.get("designation", "")).strip()
        
        # Read optional role from sheet, fallback to employee
        role = str(row.get("role", "employee")).strip().lower()
        if role not in ["owner", "employee", "user"]:
            role = "employee"

        # Check empty fields
        if not name or name.lower() == "nan":
            errors.append({"row": row_num, "error": "Name cannot be blank."})
            failed_count += 1
            continue
        if not email or email.lower() == "nan":
            errors.append({"row": row_num, "error": "Email cannot be blank."})
            failed_count += 1
            continue
        if not company or company.lower() == "nan":
            errors.append({"row": row_num, "error": "Company Name cannot be blank."})
            failed_count += 1
            continue
        if not dept or dept.lower() == "nan":
            errors.append({"row": row_num, "error": "Department cannot be blank."})
            failed_count += 1
            continue
        if not desig or desig.lower() == "nan":
            errors.append({"row": row_num, "error": "Designation cannot be blank."})
            failed_count += 1
            continue

        # Check email format
        if not EMAIL_REGEX.match(email):
            errors.append({"row": row_num, "error": f"Invalid email format: '{email}'"})
            failed_count += 1
            continue

        # Check file-level duplicate email
        email_lower = email.lower()
        if email_lower in uploaded_emails:
            errors.append({"row": row_num, "error": f"Duplicate email in upload: '{email}'"})
            failed_count += 1
            continue
        uploaded_emails.add(email_lower)

        try:
            # Resolve or create organization based on company name
            org_id = await get_or_create_organization(db, company)
            
            await create_standard_user(
                db=db,
                full_name=name,
                email=email,
                company_name=company,
                department=dept,
                designation=desig,
                is_active=True,
                role=role,
                organization_id=org_id
            )
            success_count += 1
        except ValueError as val_err:
            errors.append({"row": row_num, "error": str(val_err)})
            failed_count += 1
        except Exception as e:
            errors.append({"row": row_num, "error": f"Database failure: {str(e)}"})
            failed_count += 1

    return {
        "success_count": success_count,
        "failed_count": failed_count,
        "errors": errors
    }
