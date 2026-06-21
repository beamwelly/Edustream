import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.session import get_db
from app.models.meeting import GoogleIntegration
from app.utils.google_api import (
    get_google_auth_url,
    exchange_code_for_tokens,
    get_user_email,
    refresh_google_token
)

router = APIRouter(prefix="/google", tags=["Google OAuth"])

@router.get("/auth-url")
async def google_auth_url():
    """
    Returns the Google OAuth 2.0 Auth URL.
    """
    try:
        url = get_google_auth_url()
        return {"auth_url": url, "url": url}
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

@router.get("/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """
    Google OAuth 2.0 Callback receiver. Exchanges code for tokens, 
    persists/upserts credentials in database, and redirects user back to Super Admin Meetings.
    """
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
                        background: #e0f2fe;
                        color: #0284c7;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 32px;
                        margin: 0 auto 24px;
                        box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.1);
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
                        background: #0284c7;
                        color: #ffffff;
                        padding: 12px 24px;
                        text-decoration: none;
                        font-weight: 700;
                        border-radius: 10px;
                        font-size: 14px;
                        display: inline-block;
                        transition: background 0.2s;
                        box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.2);
                    }}
                    .btn:hover {{
                        background: #0369a1;
                    }}
                </style>
                <script>
                    setTimeout(function() {{
                        window.location.href = "{frontend_url}/super-admin/meetings?google_connected=true";
                    }}, 2000);
                </script>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✓</div>
                    <h2>Connected Successfully!</h2>
                    <p>Masterclass is now integrated with your Google Calendar to auto-generate secure Google Meet links.</p>
                    <a href="{frontend_url}/super-admin/meetings?google_connected=true" class="btn">Return to App</a>
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
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                        text-align: center;
                        max-width: 400px;
                        border: 1px solid #e5e7eb;
                    }}
                    .icon {{
                        width: 64px;
                        height: 64px;
                        background: #fee2e2;
                        color: #dc2626;
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
                        font-weight: 800;
                    }}
                    p {{
                        color: #4b5563;
                        font-size: 14px;
                        line-height: 1.5;
                        margin: 0 0 24px;
                    }}
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✕</div>
                    <h2>Connection Failed</h2>
                    <p>{str(e)}</p>
                </div>
            </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)

@router.get("/status")
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

@router.post("/disconnect")
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

@router.post("/diagnose")
async def google_diagnose(db: AsyncSession = Depends(get_db)):
    """
    Diagnostic endpoint to test Google Calendar integration.
    """
    from app.routes.meetings import get_valid_google_token
    access_token = await get_valid_google_token(db)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token missing. Please connect Google Calendar first."
        )
    try:
        from app.utils.google_api import diagnose_google_calendar_event
        result = await diagnose_google_calendar_event(access_token)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Diagnostic check failed: {str(e)}"
        )
