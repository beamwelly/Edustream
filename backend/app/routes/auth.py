import os
from typing import Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.services.auth_service import authenticate_user
from app.models.meeting import GoogleIntegration

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str | None = None  # admin, user

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    organization_id: int | None = None
    organization_name: str | None = None
    is_temp_password: bool
    is_active: bool
    permissions: Optional[dict] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Endpoint to authenticate users based on email, password, and selected workspace role.
    Verifies existence, active status, and password correctness.
    """
    auth_data, error_message = await authenticate_user(
        db=db,
        email=payload.email,
        password=payload.password,
        role=payload.role
    )
    
    if error_message:
        print(f"[AUTH LOGIN ERROR] Failed login attempt: email={payload.email}, error={error_message}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_message
        )
        
    user_info = auth_data.get("user", {})
    user_id = user_info.get("id")
    user_role = user_info.get("role")
    
    # Fetch permissions
    if user_role == "employee":
        from app.models.employee_permission import EmployeePermission
        stmt_perm = select(EmployeePermission).where(EmployeePermission.user_id == user_id)
        res_perm = await db.execute(stmt_perm)
        perm = res_perm.scalar_one_or_none()
        if perm:
            user_info["permissions"] = {
                "access_dashboard": perm.access_dashboard,
                "access_content": perm.access_content,
                "access_masterclasses": perm.access_masterclasses,
                "access_meetings": perm.access_meetings,
                "access_feedback": perm.access_feedback,
                "allowed_tools": perm.allowed_tools or [],
                "allowed_categories": perm.allowed_categories or []
            }
        else:
            user_info["permissions"] = {
                "access_dashboard": False,
                "access_content": False,
                "access_masterclasses": False,
                "access_meetings": False,
                "access_feedback": False,
                "allowed_tools": [],
                "allowed_categories": []
            }
    else:
        user_info["permissions"] = {
            "access_dashboard": True,
            "access_content": True,
            "access_masterclasses": True,
            "access_meetings": True,
            "access_feedback": True,
            "allowed_tools": ["needs_discovery", "financial_discovery", "wow_toolkit"],
            "allowed_categories": []
        }
    
    # Audit logging for role-routing: decode JWT to verify claims
    from app.utils.security import decode_access_token
    token = auth_data.get("access_token")
    decoded = decode_access_token(token) if token else {}
    jwt_role = decoded.get("role")
    target_route = "/admin" if user_info.get("role") == "admin" else "/user"
    
    print(f"[AUTH LOGIN SUCCESS] email={user_info.get('email')}, role={user_info.get('role')}, jwt role={jwt_role}, target route={target_route}")
    return auth_data

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.security import decode_access_token, hash_password, verify_password
from app.models.user import User
from sqlalchemy import select

security = HTTPBearer()

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Allows any authenticated user to securely update their account password.
    """
    token = credentials.credentials
    user_payload = decode_access_token(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="Session expired or invalid token.")
    
    user_id = user_payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token claims.")

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password check failed. Please verify your password.")

    if verify_password(payload.new_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="New password cannot be the same as your current password.")

    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation password do not match.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    user.hashed_password = hash_password(payload.new_password)
    user.is_temp_password = False
    await db.commit()

    return {"status": "success", "message": "Password changed successfully."}


from app.utils.google_api import get_google_auth_url
from sqlalchemy import select

@router.get("/google/auth-url")
async def google_auth_url():
    """
    Returns the Google OAuth 2.0 Auth URL for Super Admin settings navigation.
    """
    try:
        url = get_google_auth_url()
        return {"url": url, "auth_url": url}
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """
    Google OAuth 2.0 Callback receiver. Exchanges code for tokens, 
    persists/upserts credentials in database, and redirects user back to Super Admin Settings.
    """
    from fastapi.responses import HTMLResponse
    from datetime import datetime, timedelta, timezone
    from app.models.meeting import GoogleIntegration
    from app.utils.google_api import exchange_code_for_tokens, get_user_email
    
    print("OAuth callback reached")
    try:
        # 1. Exchange auth code for tokens
        tokens = await exchange_code_for_tokens(code)
        print("Token exchange successful")
        access_token = tokens["access_token"]
        refresh_token = tokens.get("refresh_token") # Google only sends refresh token on FIRST authorization
        expires_in = tokens.get("expires_in", 3600)
        
        # 2. Get email from Google info endpoint
        google_email = await get_user_email(access_token)
        if not google_email:
            raise Exception("Failed to retrieve Google email address.")
        print("Google profile:", google_email)
            
        token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # 3. Check if integration exists, upsert
        stmt = select(GoogleIntegration).order_by(GoogleIntegration.id.desc())
        res = await db.execute(stmt)
        existing = res.scalars().first()
        
        print("Saving integration")
        if existing:
            existing.google_email = google_email
            existing.access_token = access_token
            if refresh_token: # Preserve old refresh token if Google didn't send a new one
                existing.refresh_token = refresh_token
            existing.token_expiry = token_expiry
        else:
            new_integ = GoogleIntegration(
                google_email=google_email,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expiry=token_expiry
            )
            db.add(new_integ)
            
        await db.commit()
        print("Redirecting to frontend")
        
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8081")
        html_content = f"""
        <!DOCTYPE html>

        <html>
            <head>
                <title>Google Integration Successful</title>
                <style>
                    body {{
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: radial-gradient(circle at top right, #fdf8f6 0%, #f9fafb 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        color: #111827;
                    }}
                    .card {{
                        background: #ffffff;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                        text-align: center;
                        max-width: 400px;
                        border: 1px solid #e5e7eb;
                    }}
                    .icon {{
                        width: 64px;
                        height: 64px;
                        background: #fdf2f8;
                        color: #ea580c;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 32px;
                        margin: 0 auto 24px;
                        box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.1);
                    }}
                    h2 {{
                        margin: 0 0 10px;
                        font-size: 22px;
                        font-weight: 800;
                    }}
                    p {{
                        color: #4b5563;
                        font-size: 14px;
                        line-height: 1.5;
                        margin: 0 0 24px;
                    }}
                    .btn {{
                        background: #ea580c;
                        color: #ffffff;
                        padding: 12px 24px;
                        text-decoration: none;
                        font-weight: 700;
                        border-radius: 10px;
                        font-size: 14px;
                        display: inline-block;
                        transition: background 0.2s;
                        box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2);
                    }}
                    .btn:hover {{
                        background: #c2410c;
                    }}
                </style>
                <script>
                    setTimeout(function() {{
                        window.location.href = "{frontend_url}/admin/meetings?google_connected=true";
                    }}, 2500);
                </script>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✓</div>
                    <h2>Connected Successfully!</h2>
                    <p>Masterclass is now integrated with your Google Calendar to auto-generate secure Google Meet links.</p>
                    <a href="{frontend_url}/admin/meetings?google_connected=true" class="btn">Return to App</a>
                </div>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=200)
    except Exception as e:
        error_html = f"""
        <!DOCTYPE html>
        <html>
            <head>
                <title>Integration Failed</title>
                <style>
                    body {{
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: #f9fafb;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }}
                    .card {{
                        background: #ffffff;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                        text-align: center;
                        max-width: 400px;
                        border: 1px solid #fca5a5;
                    }}
                    .icon {{
                        width: 64px;
                        height: 64px;
                        background: #fef2f2;
                        color: #ef4444;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 32px;
                        margin: 0 auto 24px;
                    }}
                    h2 {{
                        margin: 0 0 10px;
                        font-size: 22px;
                    }}
                    p {{
                        color: #4b5563;
                        font-size: 14px;
                        margin-bottom: 24px;
                    }}
                    .btn {{
                        background: #ef4444;
                        color: #ffffff;
                        padding: 12px 24px;
                        text-decoration: none;
                        font-weight: 700;
                        border-radius: 10px;
                        font-size: 14px;
                        display: inline-block;
                    }}
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✗</div>
                    <h2>OAuth Connection Failed</h2>
                    <p>Error details: {str(e)}</p>
                    <a href="{frontend_url}/admin/meetings?google_error=true" class="btn">Back to Meetings</a>
                </div>
            </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)

from app.utils.google_api import refresh_google_token

@router.get("/google/status")
async def google_status(db: AsyncSession = Depends(get_db)):
    """
    Returns the current Google Integration connection status.
    """
    stmt = select(GoogleIntegration).order_by(GoogleIntegration.id.desc())
    res = await db.execute(stmt)
    integration = res.scalars().first()
    if not integration:
        return {
            "connected": False,
            "email": None,
            "token_valid": False
        }
    
    # Check if token is expired or close to expiring, try to refresh it
    now = datetime.now(timezone.utc)
    token_exp_utc = integration.token_expiry
    if token_exp_utc.tzinfo is None:
        token_exp_utc = token_exp_utc.replace(tzinfo=timezone.utc)
        
    token_valid = True
    if token_exp_utc < (now + timedelta(minutes=2)):
        if integration.refresh_token:
            try:
                refresh_data = await refresh_google_token(integration.refresh_token)
                integration.access_token = refresh_data["access_token"]
                expires_in = refresh_data.get("expires_in", 3600)
                integration.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                await db.commit()
                await db.refresh(integration)
            except Exception as e:
                print(f"Error auto-refreshing Google token in status: {e}")
                token_valid = False
        else:
            token_valid = False
            
    return {
        "connected": True,
        "email": integration.google_email,
        "token_valid": token_valid
    }

@router.post("/google/disconnect")
async def google_disconnect(db: AsyncSession = Depends(get_db)):
    """
    Disconnects the Google integration and purges stored credentials.
    """
    stmt = select(GoogleIntegration)
    res = await db.execute(stmt)
    integrations = res.scalars().all()
    for item in integrations:
        await db.delete(item)
    await db.commit()
    return {"status": "success", "message": "Google Calendar disconnected."}
