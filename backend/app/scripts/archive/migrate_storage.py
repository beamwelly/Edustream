import os
import re
import httpx
import asyncio
import logging
from sqlalchemy import select
from app.database.database import SessionLocal
from app.models.content import ContentItem
from app.models.tool import ToolRegistry
from app.models.masterclass import Masterclass

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("storage_migration")

def load_old_credentials():
    """
    Parses backend/.env to find commented out old Supabase credentials
    """
    env_path = ".env"
    if not os.path.exists(env_path):
        env_path = "../.env"
        
    old_creds = {
        "url": None,
        "service_role_key": None,
        "bucket": None
    }
    
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            content = f.read()
            # Match commented or uncommented old credentials
            url_match = re.search(r"#?\s*SUPABASE_URL\s*=\s*(https://dgdvweiladwfptkdfqlz\.supabase\.co\S*)", content)
            if not url_match:
                # Fallback to general old url matching if exact domain isn't commented
                url_match = re.search(r"#?\s*SUPABASE_URL\s*=\s*(https://\S+supabase\.co\S*)", content)
            
            key_match = re.search(r"#?\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(\S+)", content)
            bucket_match = re.search(r"#?\s*SUPABASE_BUCKET\s*=\s*(\S+)", content)
            
            if url_match:
                old_creds["url"] = url_match.group(1).strip()
            if key_match:
                old_creds["service_role_key"] = key_match.group(1).strip()
            if bucket_match:
                old_creds["bucket"] = bucket_match.group(1).strip()
                
    # Fallback to hardcoded old credentials if env parsing fails or has wrong keys
    if not old_creds["url"]:
        old_creds["url"] = "https://dgdvweiladwfptkdfqlz.supabase.co"
    if not old_creds["service_role_key"]:
        old_creds["service_role_key"] = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZHZ3ZWls"
            "YWR3ZnB0a2RmcWx6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA0ODE3OCwiZXhwIjoy"
            "MDk1NjI0MTc4fQ.LKU_g6qheaBrT57-V1I64Zd0s9Qe6iLlKhQef9lAZKw"
        )
    if not old_creds["bucket"]:
        old_creds["bucket"] = "edu-content-library"
        
    return old_creds

# Load active environment variables (for the new target storage)
NEW_SUPABASE_URL = os.getenv("SUPABASE_URL")
NEW_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
NEW_BUCKET = os.getenv("SUPABASE_BUCKET")

# Resolve old credentials
OLD_CREDS = load_old_credentials()
OLD_SUPABASE_URL = OLD_CREDS["url"]
OLD_SERVICE_ROLE_KEY = OLD_CREDS["service_role_key"]
OLD_BUCKET = OLD_CREDS["bucket"]

logger.info(f"--- Migration Configuration ---")
logger.info(f"Old Supabase URL: {OLD_SUPABASE_URL}")
logger.info(f"Old Bucket: {OLD_BUCKET}")
logger.info(f"New Supabase URL: {NEW_SUPABASE_URL}")
logger.info(f"New Bucket: {NEW_BUCKET}")
logger.info(f"-------------------------------")

async def ensure_bucket_exists(client: httpx.AsyncClient):
    """
    Ensures that the new bucket exists in the new Supabase project.
    """
    headers = {
        "Authorization": f"Bearer {NEW_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Check if bucket exists
    check_url = f"{NEW_SUPABASE_URL}/storage/v1/bucket/{NEW_BUCKET}"
    res = await client.get(check_url, headers=headers)
    if res.status_code == 200:
        logger.info(f"New bucket '{NEW_BUCKET}' already exists.")
        return
        
    # Create public bucket
    create_url = f"{NEW_SUPABASE_URL}/storage/v1/bucket"
    payload = {
        "id": NEW_BUCKET,
        "name": NEW_BUCKET,
        "public": True
    }
    create_res = await client.post(create_url, json=payload, headers=headers)
    if create_res.status_code == 200:
        logger.info(f"Successfully created new public bucket '{NEW_BUCKET}'.")
    else:
        logger.error(f"Failed to create new bucket: {create_res.status_code} - {create_res.text}")

async def create_folders_structure(client: httpx.AsyncClient):
    """
    Pre-creates folder structure in the new Supabase bucket using .keep files.
    """
    folders = [
        "Calculations",
        "Finance",
        "Finance_and_Tech",
        "Marketing",
        "masterclasses",
        "masterclasses/thumbnails",
        "Operations",
        "Sale",
        "Sales",
        "Technology",
        "tools",
        "documents",
        "content-library",
        "feedback",
        "reports",
        "recordings",
        "avatars",
        "uploads"
    ]
    
    headers = {
        "Authorization": f"Bearer {NEW_SERVICE_ROLE_KEY}",
        "Content-Type": "text/plain"
    }
    
    logger.info("Initializing folder structure in the new bucket...")
    for folder in folders:
        placeholder_path = f"{folder}/.keep"
        info_url = f"{NEW_SUPABASE_URL}/storage/v1/object/info/{NEW_BUCKET}/{placeholder_path}"
        
        # Check if already exists
        check_res = await client.get(info_url, headers={"Authorization": f"Bearer {NEW_SERVICE_ROLE_KEY}"})
        if check_res.status_code == 200:
            logger.info(f"  Folder '{folder}/' already initialized.")
            continue
            
        # Upload placeholder file
        upload_url = f"{NEW_SUPABASE_URL}/storage/v1/object/{NEW_BUCKET}/{placeholder_path}"
        res = await client.post(upload_url, content=b"placeholder", headers=headers)
        if res.status_code == 200:
            logger.info(f"  Created folder: {folder}/")
        else:
            logger.warning(f"  Could not create folder '{folder}': {res.status_code} - {res.text}")

async def download_file(client: httpx.AsyncClient, storage_path: str) -> bytes:
    """
    Downloads file content from the old Supabase storage.
    """
    url = f"{OLD_SUPABASE_URL}/storage/v1/object/authenticated/{OLD_BUCKET}/{storage_path.lstrip('/')}"
    headers = {
        "Authorization": f"Bearer {OLD_SERVICE_ROLE_KEY}"
    }
    
    res = await client.get(url, headers=headers, timeout=60.0)
    if res.status_code == 200:
        return res.content
    else:
        raise Exception(f"Failed to download from old storage: {res.status_code} - {res.text}")

async def upload_file(client: httpx.AsyncClient, storage_path: str, file_bytes: bytes, content_type: str) -> str:
    """
    Uploads file content to the new Supabase storage.
    Returns the new public URL.
    """
    url = f"{NEW_SUPABASE_URL}/storage/v1/object/{NEW_BUCKET}/{storage_path.lstrip('/')}"
    headers = {
        "Authorization": f"Bearer {NEW_SERVICE_ROLE_KEY}",
        "Content-Type": content_type
    }
    
    # Check if file already exists in new bucket to prevent redundant upload
    info_url = f"{NEW_SUPABASE_URL}/storage/v1/object/info/{NEW_BUCKET}/{storage_path.lstrip('/')}"
    info_res = await client.get(info_url, headers={"Authorization": f"Bearer {NEW_SERVICE_ROLE_KEY}"})
    if info_res.status_code == 200:
        logger.info(f"  File '{storage_path}' already exists in new bucket. Skipping upload.")
        return f"{NEW_SUPABASE_URL}/storage/v1/object/public/{NEW_BUCKET}/{storage_path.lstrip('/')}"
        
    res = await client.post(url, content=file_bytes, headers=headers, timeout=60.0)
    if res.status_code == 200:
        return f"{NEW_SUPABASE_URL}/storage/v1/object/public/{NEW_BUCKET}/{storage_path.lstrip('/')}"
    else:
        raise Exception(f"Failed to upload to new storage: {res.status_code} - {res.text}")

def get_mime_type(filename: str) -> str:
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    mime_types = {
        "pdf": "application/pdf",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls": "application/vnd.ms-excel",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ppt": "application/vnd.ms-powerpoint",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "mp4": "video/mp4",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "zip": "application/zip",
        "html": "text/html",
        "md": "text/markdown"
    }
    return mime_types.get(ext, "application/octet-stream")

async def migrate():
    async with httpx.AsyncClient() as client:
        # 1. Pre-requisites: Ensure bucket & folders exist
        await ensure_bucket_exists(client)
        await create_folders_structure(client)
        
        # 2. Database Migration Session
        async with SessionLocal() as session:
            logger.info("Scanning database tables for storage references...")
            
            # --- Migrate ContentItems ---
            res = await session.execute(select(ContentItem))
            items = res.scalars().all()
            
            content_migrated = 0
            content_skipped = 0
            content_errors = 0
            
            for item in items:
                # Check if it needs migration: points to old host or old bucket
                is_old_host = "dgdvweiladwfptkdfqlz.supabase.co" in (item.public_url or "")
                is_old_bucket = item.bucket_name == OLD_BUCKET or (OLD_BUCKET in (item.public_url or ""))
                
                if is_old_host or is_old_bucket:
                    logger.info(f"Migrating ContentItem {item.id}: {item.title} ({item.storage_path})")
                    try:
                        # Download from old
                        file_bytes = await download_file(client, item.storage_path)
                        # Upload to new
                        mime = item.mime_type or get_mime_type(item.storage_path)
                        new_url = await upload_file(client, item.storage_path, file_bytes, mime)
                        
                        # Update DB row
                        item.public_url = new_url
                        item.bucket_name = NEW_BUCKET
                        item.storage_provider = "Supabase"
                        
                        session.add(item)
                        content_migrated += 1
                        logger.info(f"  Successfully migrated to: {new_url}")
                    except Exception as e:
                        logger.error(f"  Error migrating ContentItem {item.id}: {e}")
                        content_errors += 1
                else:
                    content_skipped += 1
                    
            if content_migrated > 0:
                await session.commit()
                logger.info(f"Committed {content_migrated} ContentItems to database.")
                
            # --- Migrate ToolRegistry ---
            res = await session.execute(select(ToolRegistry))
            tools = res.scalars().all()
            
            tools_migrated = 0
            tools_skipped = 0
            tools_errors = 0
            
            for tool in tools:
                if tool.file_path and ("dgdvweiladwfptkdfqlz.supabase.co" in tool.file_path or OLD_BUCKET in tool.file_path):
                    logger.info(f"Migrating ToolRegistry {tool.id}: {tool.name}")
                    try:
                        # Extract storage path
                        storage_path = tool.file_path
                        if "/storage/v1/object/public/" in storage_path:
                            parts = storage_path.split(f"/{OLD_BUCKET}/")
                            if len(parts) > 1:
                                storage_path = parts[1]
                        
                        # Fallback if the path is full URL
                        if storage_path.startswith("http"):
                            storage_path = f"tools/{tool.storage_filename or os.path.basename(storage_path)}"
                            
                        # Download
                        file_bytes = await download_file(client, storage_path)
                        # Upload
                        mime = get_mime_type(storage_path)
                        new_url = await upload_file(client, storage_path, file_bytes, mime)
                        
                        # Update DB row
                        tool.file_path = new_url
                        
                        session.add(tool)
                        tools_migrated += 1
                        logger.info(f"  Successfully migrated to: {new_url}")
                    except Exception as e:
                        logger.error(f"  Error migrating ToolRegistry {tool.id}: {e}")
                        tools_errors += 1
                else:
                    tools_skipped += 1
                    
            if tools_migrated > 0:
                await session.commit()
                logger.info(f"Committed {tools_migrated} ToolRegistry entries to database.")
                
            # --- Migrate Masterclasses (Thumbnails) ---
            res = await session.execute(select(Masterclass))
            mcs = res.scalars().all()
            
            mcs_migrated = 0
            mcs_skipped = 0
            mcs_errors = 0
            
            for mc in mcs:
                if mc.thumbnail_url and ("dgdvweiladwfptkdfqlz.supabase.co" in mc.thumbnail_url or OLD_BUCKET in mc.thumbnail_url):
                    logger.info(f"Migrating Masterclass {mc.masterclass_id}: {mc.title} (thumbnail)")
                    try:
                        # Extract storage path
                        storage_path = mc.thumbnail_url
                        if "/storage/v1/object/public/" in storage_path:
                            parts = storage_path.split(f"/{OLD_BUCKET}/")
                            if len(parts) > 1:
                                storage_path = parts[1]
                        
                        if storage_path.startswith("http"):
                            storage_path = f"masterclasses/thumbnails/{os.path.basename(storage_path)}"
                            
                        # Download
                        file_bytes = await download_file(client, storage_path)
                        # Upload
                        mime = get_mime_type(storage_path)
                        new_url = await upload_file(client, storage_path, file_bytes, mime)
                        
                        # Update DB row
                        mc.thumbnail_url = new_url
                        
                        session.add(mc)
                        mcs_migrated += 1
                        logger.info(f"  Successfully migrated to: {new_url}")
                    except Exception as e:
                        logger.error(f"  Error migrating Masterclass {mc.masterclass_id} thumbnail: {e}")
                        mcs_errors += 1
                else:
                    mcs_skipped += 1
                    
            if mcs_migrated > 0:
                await session.commit()
                logger.info(f"Committed {mcs_migrated} Masterclass entries to database.")
                
            # Print Migration Summary Logs
            logger.info("=========================================")
            logger.info("       STORAGE MIGRATION SUMMARY         ")
            logger.info("=========================================")
            logger.info(f"Content Items: Migrated={content_migrated}, Skipped={content_skipped}, Errors={content_errors}")
            logger.info(f"Tool Registry: Migrated={tools_migrated}, Skipped={tools_skipped}, Errors={tools_errors}")
            logger.info(f"Masterclasses: Migrated={mcs_migrated}, Skipped={mcs_skipped}, Errors={mcs_errors}")
            logger.info("=========================================")

if __name__ == "__main__":
    asyncio.run(migrate())
