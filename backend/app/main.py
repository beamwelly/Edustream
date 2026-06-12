from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager

from app.database.database import engine
from app.database.base import Base
# Import models to ensure they are loaded in Base.metadata during startup
from app.models.user import User
from app.models.organization import Organization
from app.models.content import ContentCategory, ContentItem
from app.models.meeting import GoogleIntegration, Meeting
from app.models.tool import ToolRegistry
from app.models.masterclass import Masterclass, MasterclassRecording, MasterclassRegistration, MasterclassWatchHistory, MasterclassEmailLog
from app.models.notification import Notification
from app.models.employee_permission import EmployeePermission
from app.models.feedback import Feedback
from app.models.wow import (
    FinancialGoal,
    VaultFamilyMember,
    VaultNominee,
    VaultInsurancePolicy,
    VaultLoan,
    VaultInvestment,
    VaultImportantDocument,
    VaultEmergencyContact,
    VaultBankAccount,
    WOWUserInputs
)

load_dotenv()

from app.utils.supabase_storage import ensure_bucket_exists

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Print and validate Google OAuth parameters on startup
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    print("--------------------------------------------------")
    print("STARTUP GOOGLE OAUTH CONFIGURATION:")
    print(f"GOOGLE_CLIENT_ID: {google_client_id}")
    print(f"GOOGLE_REDIRECT_URI: {google_redirect_uri}")
    print("--------------------------------------------------")

    # Dynamically create all tables in Neon PostgreSQL on start
    async with engine.begin() as conn:
        from sqlalchemy import text
        for table, check_col in [
            ("vault_family_members", "dob"),
            ("vault_insurance_policies", "company"),
            ("vault_investments", "investment_type"),
            ("vault_important_documents", "storage_location"),
            ("vault_emergency_contacts", "name")
        ]:
            try:
                res = await conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = '{table}' AND column_name = '{check_col}'
                    );
                """))
                exists = res.scalar()
                if not exists:
                    table_exists_res = await conn.execute(text(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = '{table}'
                        );
                    """))
                    if table_exists_res.scalar():
                        print(f"Dropping outdated vault table: {table}")
                        await conn.execute(text(f"DROP TABLE {table} CASCADE;"))
            except Exception as e:
                print(f"Warning checking/dropping table {table}: {e}")

        from app.models.financial_discovery import FinancialDiscoveryProfile
        from app.models.needs_discovery import NeedsDiscoveryProfile
        await conn.run_sync(Base.metadata.create_all)
        
        from sqlalchemy import text
        try:
            supabase_bucket = os.getenv("SUPABASE_BUCKET", "edustream-content-library")
            await conn.execute(text("ALTER TABLE content_library ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(100) DEFAULT 'Supabase';"))
            await conn.execute(text(f"ALTER TABLE content_library ADD COLUMN IF NOT EXISTS bucket_name VARCHAR(255) DEFAULT '{supabase_bucket}';"))
            await conn.execute(text("ALTER TABLE content_library ADD COLUMN IF NOT EXISTS original_filename VARCHAR(500);"))
            await conn.execute(text("ALTER TABLE content_library ADD COLUMN IF NOT EXISTS storage_filename VARCHAR(500);"))
            await conn.execute(text("ALTER TABLE content_library ADD COLUMN IF NOT EXISTS warning VARCHAR(500);"))
            await conn.execute(text("ALTER TABLE content_library ADD COLUMN IF NOT EXISTS mime_type VARCHAR(255);"))
            await conn.execute(text("ALTER TABLE content_library ADD COLUMN IF NOT EXISTS folder VARCHAR(255) DEFAULT 'General';"))
            await conn.execute(text("ALTER TABLE content_library ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'owner_employee';"))
            await conn.execute(text("ALTER TABLE content_library ADD COLUMN IF NOT EXISTS organization_id INTEGER;"))
            
            # Tools registry table migrations
            await conn.execute(text("ALTER TABLE tools_registry ADD COLUMN IF NOT EXISTS original_filename VARCHAR(500);"))
            await conn.execute(text("ALTER TABLE tools_registry ADD COLUMN IF NOT EXISTS storage_filename VARCHAR(500);"))
            
            # Masterclasses migrations
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS recording_filename VARCHAR(500);"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'upcoming';"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS speaker VARCHAR(255);"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS zoom_webinar_id VARCHAR(255);"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS zoom_join_url VARCHAR(1000);"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS zoom_start_url VARCHAR(1000);"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS category VARCHAR(255);"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS tags VARCHAR(1000);"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS learning_outcomes VARCHAR(2000);"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS max_attendees INTEGER;"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public';"))
            await conn.execute(text("ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'edustream';"))
            
            # User table migrations
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pref_masterclass_notifications BOOLEAN DEFAULT TRUE;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pref_email_notifications BOOLEAN DEFAULT TRUE;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pref_recording_notifications BOOLEAN DEFAULT TRUE;"))
            
            # Populate company_name from organization if null
            await conn.execute(text("""
                UPDATE users u
                SET company_name = o.organization_name
                FROM organizations o
                WHERE u.organization_id = o.id AND (u.company_name IS NULL OR u.company_name = '');
            """))
            
            # Fallback company_name for super_admin
            await conn.execute(text("""
                UPDATE users
                SET company_name = 'Masterclass'
                WHERE (company_name IS NULL OR company_name = '');
            """))
            # Role migration removed to prevent resetting admin users to standard users on reload
            pass
        except Exception as e:
            print("DB Migration Alter Query Warning:", str(e))

    # Ensure Supabase Storage bucket exists
    await ensure_bucket_exists()

    # Pre-create folder placeholders for all categories in database
    from app.database.database import SessionLocal
    from app.models.content import ContentCategory
    from app.utils.supabase_storage import ensure_supabase_folder_exists
    from sqlalchemy import select

    async with SessionLocal() as session:
        try:
            stmt = select(ContentCategory)
            res = await session.execute(stmt)
            cats = res.scalars().all()
            for cat in cats:
                await ensure_supabase_folder_exists(cat.name)
            print(f"Pre-initialized Supabase folders for {len(cats)} categories successfully.")
        except Exception as e:
            print("Category Folder Pre-initialization Warning:", str(e))

    # Start background reminders scheduler loop
    import asyncio
    from app.routes.masterclasses import check_and_send_reminders_loop
    loop_task = asyncio.create_task(check_and_send_reminders_loop())

    yield
    
    # Cancel task on shutdown
    loop_task.cancel()
    # Dispose connection pools cleanly on shutdown
    await engine.dispose()

app = FastAPI(
    title="Masterclass API",
    description="Learning platform API",
    version="0.1.0",
    lifespan=lifespan
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print("VALIDATION ERROR DETAILS:", exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )
frontend_origins_str = os.getenv("FRONTEND_URL", "")
frontend_origins = [origin.strip() for origin in frontend_origins_str.split(",") if origin.strip()]

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
for origin in frontend_origins:
    if origin not in allowed_origins:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex="https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Route registrations
from app.routes.auth import router as auth_router
app.include_router(auth_router)

from app.routes.users_mgmt import router as users_mgmt_router
app.include_router(users_mgmt_router)

from app.routes.users import router as users_router
app.include_router(users_router)

from app.routes.content import router as content_router
app.include_router(content_router)

from app.routes.meetings import router as meetings_router
app.include_router(meetings_router)

from app.routes.google import router as google_router
app.include_router(google_router, prefix="/meetings")

from app.routes.wow import router as wow_router
app.include_router(wow_router)

from app.routes.masterclasses import router as masterclasses_router, zoom_router
app.include_router(masterclasses_router)
app.include_router(zoom_router)

from app.routes.notifications import router as notifications_router
app.include_router(notifications_router)

from app.routes.feedback import router as feedback_router
app.include_router(feedback_router)

from app.routes.financial_discovery import router as financial_discovery_router
app.include_router(financial_discovery_router)

from app.routes.needs_discovery import router as needs_discovery_router
app.include_router(needs_discovery_router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "masterclass-api"}

from app.services.email_service import send_email_async

@app.get("/test-email")
async def test_email(to: str):
    """
    Simple test endpoint to verify SMTP configuration and send a test email.
    """
    subject = "Masterclass SMTP Connection Test"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4F46E5;">Masterclass SMTP Connection Success!</h2>
            <p>This is a test email sent from the FastAPI backend to verify your Gmail SMTP integration.</p>
            <p><strong>SMTP Host:</strong> {os.getenv("SMTP_HOST")}</p>
            <p><strong>Sender Email:</strong> {os.getenv("SMTP_FROM")}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #777;">If you received this email, your SMTP configuration is fully working and production-ready!</p>
        </body>
    </html>
    """
    
    success = await send_email_async(to, subject, body, is_html=True)
    if success:
        return {"status": "success", "message": f"Test email sent successfully to {to}"}
    else:
        return {"status": "error", "message": "Failed to send test email. Check server logs."}
