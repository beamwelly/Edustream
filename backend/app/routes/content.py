import os
import io
import math
import zipfile
import uuid
import httpx
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, or_, func

from app.database.session import get_db
from app.models.user import User
from app.routes.users import require_permission
from app.models.content import ContentCategory, ContentItem
from app.utils.security import decode_access_token
from app.utils.supabase_storage import (
    upload_file_to_supabase,
    delete_file_from_supabase,
    create_signed_url,
    verify_file_exists_in_supabase,
    list_all_files_in_supabase,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    BUCKET_NAME,
    ensure_supabase_folder_exists
)
from app.utils.redis_cache import cache_get, cache_set, cache_invalidate_all
from app.services.notification_service import create_notification
router = APIRouter(prefix="/content", tags=["Content Library"])
security = HTTPBearer()

# --- Authentication Dependencies ---

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

async def get_current_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. This action requires Admin privileges."
        )
    return current_user

# --- Helper Utilities ---

def format_file_size(size_in_bytes: int) -> str:
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024 * 1024:
        return f"{size_in_bytes / 1024:.1f} KB"
    elif size_in_bytes < 1024 * 1024 * 1024:
        return f"{size_in_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_in_bytes / (1024 * 1024 * 1024):.1f} GB"

def get_file_type_from_name(filename: str) -> str:
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext == "pdf":
        return "PDF"
    elif ext in ["doc", "docx"]:
        return "DOCX"
    elif ext in ["xls", "xlsx"]:
        return "XLSX"
    elif ext in ["ppt", "pptx"]:
        return "PPTX"
    elif ext == "mp4":
        return "Video"
    elif ext in ["png", "jpg", "jpeg"]:
        return "Image"
    elif ext == "zip":
        return "Archive"
    else:
        return ext.upper() if ext else "File"

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
        "zip": "application/zip"
    }
    return mime_types.get(ext, "application/octet-stream")

# --- Category Schemas ---
class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: str

# --- Category Endpoints ---

@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("content_library"))
):
    cached_cats = cache_get("content:categories")
    if cached_cats is not None:
        cats_data = list(cached_cats)
    else:
        stmt = select(ContentCategory).order_by(ContentCategory.name.asc())
        res = await db.execute(stmt)
        cats = res.scalars().all()
        cats_data = [{"id": c.id, "name": c.name} for c in cats]
        cache_set("content:categories", cats_data, ttl=3600)
    
    if current_user.role == "employee":
        # Removed category-specific filtering under global policy model
        pass
        
    return cats_data

@router.post("/categories")
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Category name cannot be blank.")
    
    # Check if category exists
    stmt = select(ContentCategory).where(func.lower(ContentCategory.name) == name_clean.lower())
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Category '{name_clean}' already exists.")
    
    new_cat = ContentCategory(name=name_clean)
    db.add(new_cat)
    await db.commit()
    await db.refresh(new_cat)
    cache_invalidate_all()

    # Guarantee folder exists and is visible in Supabase dashboard
    await ensure_supabase_folder_exists(new_cat.name)

    return new_cat

@router.put("/categories/{category_id}")
async def rename_category(
    category_id: int,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Category name cannot be blank.")
    
    # Check if category exists
    stmt_exist = select(ContentCategory).where(ContentCategory.id == category_id)
    res_exist = await db.execute(stmt_exist)
    cat = res_exist.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    # Check for name clash
    stmt_clash = select(ContentCategory).where(
        func.lower(ContentCategory.name) == name_clean.lower(),
        ContentCategory.id != category_id
    )
    res_clash = await db.execute(stmt_clash)
    if res_clash.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Category '{name_clean}' already exists.")

    old_name = cat.name
    cat.name = name_clean
    
    # Update all items with the old category name to the new category name
    stmt_items = update(ContentItem).where(ContentItem.category == old_name).values(category=name_clean)
    await db.execute(stmt_items)
    
    await db.commit()
    await db.refresh(cat)
    cache_invalidate_all()

    # Ensure renamed category virtual folder exists
    await ensure_supabase_folder_exists(cat.name)

    return cat

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    stmt = select(ContentCategory).where(ContentCategory.id == category_id)
    res = await db.execute(stmt)
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    # Query all active items inside this category and delete their Supabase objects to prevent orphans
    stmt_items = select(ContentItem).where(ContentItem.category == cat.name)
    res_items = await db.execute(stmt_items)
    items = res_items.scalars().all()

    for item in items:
        await delete_file_from_supabase(item.storage_path)
        await db.delete(item)

    # Delete the virtual folder placeholder file if it exists
    folder_prefix = cat.name.strip().replace(" ", "_")
    await delete_file_from_supabase(f"{folder_prefix}/.keep")

    await db.delete(cat)
    await db.commit()
    cache_invalidate_all()
    return {"message": f"Successfully deleted category '{cat.name}' and all associated assets."}


# --- Content Items Schemas ---
class ContentUpdatePayload(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    is_active: bool
    visibility: Optional[str] = "owner_employee"

# --- Content Endpoints ---

@router.get("/items")
async def list_content_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    file_type: Optional[str] = None,
    sort: Optional[str] = "newest",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("content_library"))
):
    role = current_user.role
    org_id = current_user.organization_id or 0
    ttl = 300
    user_suffix = f":{current_user.id}" if current_user.role != "admin" else ""
    cache_key = f"content:list:{role}:{org_id}:{search or ''}:{category or ''}:{file_type or ''}:{sort or ''}{user_suffix}"
    cached_data = cache_get(cache_key)
    if cached_data is not None:
        return cached_data

    stmt = select(ContentItem)
    # 30-day registration visibility filter for non-admin users
    if current_user.role != "admin":
        from datetime import timedelta
        threshold = current_user.created_at - timedelta(days=30)
        stmt = stmt.where(ContentItem.uploaded_at >= threshold)

    # For standard users, only active files are served. Admins and Owners can see all.
    if current_user.role not in ("admin", "owner"):
        stmt = stmt.where(ContentItem.is_active == True)
        stmt = stmt.where(ContentItem.visibility == "owner_employee")

    # Filters
    if search:
        search_clean = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(ContentItem.title).like(search_clean),
                func.lower(ContentItem.description).like(search_clean)
            )
        )
    if category and category != "All":
        stmt = stmt.where(ContentItem.category == category)
    if file_type:
        stmt = stmt.where(ContentItem.file_type == file_type)

    # Sort
    if sort == "oldest":
        stmt = stmt.order_by(ContentItem.uploaded_at.asc())
    else:
        stmt = stmt.order_by(ContentItem.uploaded_at.desc())

    res = await db.execute(stmt)
    items = res.scalars().all()

    # Resolve uploader organization names dynamically
    user_stmt = select(User)
    user_res = await db.execute(user_stmt)
    users = user_res.scalars().all()
    user_orgs = {}
    for u in users:
        if u.full_name:
            user_orgs[u.full_name] = u.company_name or "Masterclass"

    async def process_item(item):
        # Explicit required logging
        print("--- File Auditing ---")
        print(f"File Source: Database")
        print(f"Storage Provider: {item.storage_provider or 'Supabase'}")
        print(f"Storage Path: {item.storage_path}")
        print("---------------------")

        # Check physical presence in bucket
        exists = await verify_file_exists_in_supabase(item.storage_path)
        if not exists:
            warning_msg = f"File exists in DB but not in Storage bucket: {item.storage_path}"
            print(f"[WARNING] {warning_msg}")
            item_warning = warning_msg
        else:
            item_warning = None

        signed_url, err = await create_signed_url(item.storage_path)
        public_url = signed_url if signed_url else item.public_url
        if not signed_url:
            print(f"[ERROR SIGNED URL] Failed to sign URL for storage path {item.storage_path}: {err}")

        return {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "category": item.category,
            "file_type": item.file_type,
            "file_size": item.file_size,
            "storage_path": item.storage_path,
            "public_url": public_url,
            "uploaded_by": item.uploaded_by,
            "uploaded_at": item.uploaded_at.isoformat() if item.uploaded_at else None,
            "is_active": item.is_active,
            "storage_provider": item.storage_provider,
            "bucket_name": item.bucket_name,
            "original_filename": item.original_filename,
            "storage_filename": item.storage_filename,
            "warning": item_warning,
            "mime_type": item.mime_type,
            "folder": item.folder,
            "organization_name": user_orgs.get(item.uploaded_by, "Masterclass")
        }

    import asyncio
    tasks = [process_item(item) for item in items]
    res_items = list(await asyncio.gather(*tasks)) if tasks else []

    cache_set(cache_key, res_items, ttl=ttl)
    return res_items

@router.post("/upload")
async def upload_content(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form(...),
    folder: Optional[str] = Form("General"),
    visibility: Optional[str] = Form("owner_employee"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    file_content = await file.read()
    file_size_bytes = len(file_content)
    
    # Save file path securely in storage
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "dat"
    unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
    # Dynamic category-based path construction as requested
    category_folder = category.strip().replace(" ", "_")
    storage_path = f"{category_folder}/{unique_filename}"
    content_type = get_mime_type(file.filename)

    # 1. Verify/Create the category folder dynamically
    await ensure_supabase_folder_exists(category)

    success, public_url, err_msg = await upload_file_to_supabase(
        file_bytes=file_content,
        file_path=storage_path,
        content_type=content_type
    )

    if not success:
        # Provide detailed API errors instead of generic 500
        if "Bucket not found" in err_msg or "400" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supabase rejected upload: Bucket not found or invalid bucket config. {err_msg}"
            )
        elif "Payload too large" in err_msg or "413" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supabase rejected upload: Invalid file type or file exceeds storage limits."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supabase rejected upload: {err_msg}"
            )

    # Post-upload verification: confirm file exists in bucket before inserting to DB
    exists = await verify_file_exists_in_supabase(storage_path)
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Upload failed: Physical file '{file.filename}' could not be verified in Supabase Storage."
        )

    # Explicit required logging
    print("--- File Auditing ---")
    print(f"File Source: UploadFile")
    print(f"Storage Provider: Supabase")
    print(f"Storage Path: {storage_path}")
    print("---------------------")

    # Create metadata item in Neon PostgreSQL
    new_item = ContentItem(
        title=title.strip(),
        description=description.strip() if description else None,
        category=category,
        folder=folder or "General",
        file_type=get_file_type_from_name(file.filename),
        file_size=format_file_size(file_size_bytes),
        storage_path=storage_path,
        public_url=public_url,
        uploaded_by=current_user.full_name,
        is_active=True,
        # Populating tracking columns
        storage_provider="Supabase",
        bucket_name=BUCKET_NAME,
        original_filename=file.filename,
        storage_filename=unique_filename,
        warning=None,
        mime_type=content_type,
        visibility=visibility or "owner_employee"
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    cache_invalidate_all()

    # Notify users
    await create_notification(
        db=db,
        title="New Content Uploaded",
        message=f"{new_item.title} has been added.",
        type="content_upload",
        reference_id=str(new_item.id),
        target_group="users"
    )

    # Dynamically generate signed URL for the immediate uploaded response
    signed_url, _ = await create_signed_url(new_item.storage_path)
    if signed_url:
        new_item.public_url = signed_url

    return new_item

@router.post("/bulk-upload-legacy")
async def bulk_upload_content(
    files: Optional[List[UploadFile]] = File(None),
    zip_file: Optional[UploadFile] = File(None),
    category: str = Form(...),
    metadata: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    import json
    metadata_dict = {}
    if metadata:
        try:
            metadata_dict = json.loads(metadata)
        except Exception as e:
            print(f"[METADATA PARSE ERROR] {e}")

    success_items = []
    failed_items = []

    # 1. Process standard file uploads
    if files:
        for file in files:
            try:
                file_content = await file.read()
                if not file_content:
                    continue
                
                # Retrieve category and folder from metadata
                file_meta = metadata_dict.get(file.filename, {})
                file_category = file_meta.get("category", category)
                file_folder = file_meta.get("folder", "General")

                file_size_bytes = len(file_content)
                file_ext = file.filename.split(".")[-1] if "." in file.filename else "dat"
                unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
                # Dynamic category-based path construction as requested
                category_folder = file_category.strip().replace(" ", "_")
                storage_path = f"{category_folder}/{unique_filename}"
                content_type = get_mime_type(file.filename)

                # Guarantee folder exists dynamically
                await ensure_supabase_folder_exists(file_category)

                success, public_url, err_msg = await upload_file_to_supabase(
                    file_bytes=file_content,
                    file_path=storage_path,
                    content_type=content_type
                )

                if success:
                    # Post-upload verification check
                    exists = await verify_file_exists_in_supabase(storage_path)
                    if exists:
                        # Strip extension for default title
                        title_default = file.filename.rsplit(".", 1)[0] if "." in file.filename else file.filename
                        
                        # Explicit required logging
                        print("--- File Auditing ---")
                        print(f"File Source: Bulk UploadFile")
                        print(f"Storage Provider: Supabase")
                        print(f"Storage Path: {storage_path}")
                        print("---------------------")

                        new_item = ContentItem(
                            title=title_default.replace("_", " ").title(),
                            description=f"Bulk uploaded asset '{file.filename}'",
                            category=file_category,
                            folder=file_folder,
                            file_type=get_file_type_from_name(file.filename),
                            file_size=format_file_size(file_size_bytes),
                            storage_path=storage_path,
                            public_url=public_url,
                            uploaded_by=current_user.full_name,
                            is_active=True,
                            storage_provider="Supabase",
                            bucket_name=BUCKET_NAME,
                            original_filename=file.filename,
                            storage_filename=unique_filename,
                            warning=None,
                            mime_type=content_type
                        )
                        db.add(new_item)
                        success_items.append(file.filename)
                    else:
                        failed_items.append({"filename": file.filename, "error": "Post-upload physical file verification in Supabase bucket failed."})
                else:
                    failed_items.append({"filename": file.filename, "error": err_msg})
            except Exception as e:
                failed_items.append({"filename": file.filename, "error": str(e)})

    # 2. Process in-memory ZIP extracting
    if zip_file:
        try:
            zip_bytes = await zip_file.read()
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
                for file_info in z.infolist():
                    if file_info.is_dir():
                        continue
                    
                    filename = os.path.basename(file_info.filename)
                    if not filename or filename.startswith(".") or filename.startswith("__"):
                        continue

                    # Retrieve category and folder from metadata
                    file_meta = metadata_dict.get(filename, {}) or metadata_dict.get(file_info.filename, {})
                    file_category = file_meta.get("category", category)
                    file_folder = file_meta.get("folder", "General")

                    try:
                        with z.open(file_info.filename) as f:
                            file_content = f.read()

                        if not file_content:
                            continue
                        
                        file_size_bytes = len(file_content)
                        file_ext = filename.split(".")[-1] if "." in filename else "dat"
                        unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
                        # Dynamic category-based path construction as requested
                        category_folder = file_category.strip().replace(" ", "_")
                        storage_path = f"{category_folder}/{unique_filename}"
                        content_type = get_mime_type(filename)

                        # Guarantee folder exists dynamically
                        await ensure_supabase_folder_exists(file_category)

                        success, public_url, err_msg = await upload_file_to_supabase(
                            file_bytes=file_content,
                            file_path=storage_path,
                            content_type=content_type
                        )

                        if success:
                            # Post-upload verification check
                            exists = await verify_file_exists_in_supabase(storage_path)
                            if exists:
                                title_default = filename.rsplit(".", 1)[0] if "." in filename else filename
                                
                                # Explicit required logging
                                print("--- File Auditing ---")
                                print(f"File Source: Bulk ZIP Extract")
                                print(f"Storage Provider: Supabase")
                                print(f"Storage Path: {storage_path}")
                                print("---------------------")

                                new_item = ContentItem(
                                    title=title_default.replace("_", " ").title(),
                                    description=f"Bulk unzipped asset '{filename}'",
                                    category=file_category,
                                    folder=file_folder,
                                    file_type=get_file_type_from_name(filename),
                                    file_size=format_file_size(file_size_bytes),
                                    storage_path=storage_path,
                                    public_url=public_url,
                                    uploaded_by=current_user.full_name,
                                    is_active=True,
                                    storage_provider="Supabase",
                                    bucket_name=BUCKET_NAME,
                                    original_filename=filename,
                                    storage_filename=unique_filename,
                                    warning=None,
                                    mime_type=content_type
                                )
                                db.add(new_item)
                                success_items.append(filename)
                            else:
                                failed_items.append({"filename": filename, "error": "Post-upload physical file verification in Supabase bucket failed."})
                        else:
                            failed_items.append({"filename": filename, "error": err_msg})
                    except Exception as zip_inner_err:
                        failed_items.append({"filename": filename, "error": str(zip_inner_err)})
        except Exception as zip_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to extract upload ZIP archive: {str(zip_err)}"
            )

    await db.commit()
    cache_invalidate_all()
    return {
        "success_count": len(success_items),
        "failed_count": len(failed_items),
        "uploaded_files": success_items,
        "errors": failed_items
    }

@router.put("/items/{item_id}")
async def update_content_metadata(
    item_id: int,
    payload: ContentUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    stmt = select(ContentItem).where(ContentItem.id == item_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content resource not found.")

    item.title = payload.title.strip()
    item.description = payload.description.strip() if payload.description else None
    item.category = payload.category
    item.is_active = payload.is_active
    item.visibility = payload.visibility or "owner_employee"

    await db.commit()
    await db.refresh(item)
    cache_invalidate_all()

    # Dynamically sign url for metadata update response
    signed_url, _ = await create_signed_url(item.storage_path)
    if signed_url:
        item.public_url = signed_url

    return item


@router.get("/download/{item_id}")
async def download_content_file(
    item_id: int,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Direct proxy download endpoint to serve files from Supabase Storage with original name headers,
    bypassing browser cross-origin limits to prevent file corruptions.
    """
    from fastapi.responses import StreamingResponse

    # Query Neon DB metadata
    stmt = select(ContentItem).where(ContentItem.id == item_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Requested file not found in database catalog.")

    # 1. Authenticate session if token query param is provided
    if token:
        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Download aborted: Session has expired.")
        user_id = payload.get("user_id")
        if user_id:
            stmt_user = select(User).where(User.id == int(user_id))
            res_user = await db.execute(stmt_user)
            user = res_user.scalar_one_or_none()
            if user:
                if not user.is_active:
                    raise HTTPException(status_code=403, detail="User account is inactive.")
                if user.role != "admin":
                    from datetime import timedelta
                    if item.uploaded_at < user.created_at - timedelta(days=30):
                        raise HTTPException(status_code=403, detail="Access denied. Asset is outside of your account registration 30-day visibility window.")
                if user.role == "employee":
                    from app.models.employee_access_policy import EmployeeAccessPolicy
                    policy_stmt = select(EmployeeAccessPolicy).where(EmployeeAccessPolicy.id == 1)
                    policy_res = await db.execute(policy_stmt)
                    policy = policy_res.scalar_one_or_none()
                    settings = policy.settings_json if policy else {}
                    if not settings.get("content_library", True):
                        raise HTTPException(status_code=403, detail="Access denied. Global Employee Policy restricts access to Content Library.")
                    if item.visibility == "owner_only":
                        raise HTTPException(status_code=403, detail="Access denied. This file is restricted to owner only.")

    # 3. Create signed URL for physical bucket query validation
    signed_url, _ = await create_signed_url(item.storage_path)

    # 4. Dynamic repair for missing extensions or generic octet-stream MIME types (critical for legacy or title fallback items)
    ext = ""
    if "." in item.storage_path:
        ext = "." + item.storage_path.split(".")[-1].lower()

    download_filename = item.original_filename or item.title or "download"
    if ext and not download_filename.lower().endswith(ext):
        download_filename = download_filename + ext

    resolved_mime = item.mime_type
    if not resolved_mime or resolved_mime == "application/octet-stream":
        resolved_mime = get_mime_type(item.storage_path)

    # EXPLICIT REQUIRED DOWNLOAD AUDIT LOGGING
    print("=== CRITICAL DOWNLOAD AUDIT LOG ===")
    print(f"original_filename: {item.original_filename}")
    print(f"download_filename: {download_filename}")
    print(f"content_type: {resolved_mime}")
    print(f"Content-Disposition: attachment; filename=\"{download_filename}\"")
    print(f"mime_type: {resolved_mime}")
    print(f"signed_url: {signed_url}")
    print("===================================")

    # 5. Fetch stream from Supabase Storage
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    # Supabase REST Storage download endpoint
    supabase_download_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{item.storage_path.lstrip('/')}"

    async def file_streamer():
        async with httpx.AsyncClient() as client:
            async with client.stream("GET", supabase_download_url, headers=headers, timeout=120.0) as stream_res:
                if stream_res.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to retrieve binary file from Supabase Storage.")
                async for chunk in stream_res.aiter_bytes(chunk_size=16384):
                    yield chunk

    # Proper Content-Disposition to force native downloads with original uploaded filename
    safe_filename = download_filename.replace('"', '\\"')

    return StreamingResponse(
        file_streamer(),
        media_type=resolved_mime,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "X-Content-Type-Options": "nosniff"
        }
    )


@router.delete("/items/{item_id}")
async def delete_content_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    stmt = select(ContentItem).where(ContentItem.id == item_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content resource not found.")

    # 1. Remove from Supabase Storage
    success, err_msg = await delete_file_from_supabase(item.storage_path)
    if not success:
        logger.error(f"Failed to delete Supabase asset: {err_msg}")
        # Note: we still proceed to delete metadata so database doesn't stay out of sync

    # 2. Remove from Neon PostgreSQL
    await db.delete(item)
    await db.commit()
    cache_invalidate_all()
    return {"message": "Resource successfully purged from storage and database."}


@router.get("/debug/storage")
async def debug_storage_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Diagnostic endpoint to identify sync issues between database records and storage bucket.
    """
    # 1. Database record count
    stmt = select(ContentItem)
    res = await db.execute(stmt)
    db_items = res.scalars().all()
    
    db_paths = {item.storage_path for item in db_items}
    
    # 2. Storage file count
    storage_paths = await list_all_files_in_supabase()
    storage_paths_set = set(storage_paths)
    
    # 3. Missing files (in Neon but missing in Supabase)
    missing_files = [path for path in db_paths if path not in storage_paths_set]
    
    # 4. Orphan files (in Supabase but missing in Neon)
    orphan_files = [path for path in storage_paths if path not in db_paths]
    
    return {
        "database_record_count": len(db_items),
        "storage_file_count": len(storage_paths),
        "missing_files_count": len(missing_files),
        "orphan_files_count": len(orphan_files),
        "database_records": list(db_paths),
        "storage_files": storage_paths,
        "missing_files": missing_files,
        "orphan_files": orphan_files
    }

class BulkUploadFile(BaseModel):
    file: str  # Base64 string
    filename: str
    category: str

class BulkUploadRequest(BaseModel):
    files: List[BulkUploadFile]
    visibility: Optional[str] = "owner_employee"

@router.post("/bulk-upload")
async def bulk_upload_content_multi(
    payload: BulkUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    import base64
    from sqlalchemy import func
    success_count = 0
    failed_count = 0
    added_categories = set()
    
    for f in payload.files:
        try:
            # 1. Validate file exists (non-empty file string and filename)
            if not f.file or not f.file.strip() or not f.filename or not f.filename.strip():
                print(f"[BULK UPLOAD ERROR] Empty file or filename payload")
                failed_count += 1
                continue

            # 2. Validate mime type/extension is valid
            ext = f.filename.split(".")[-1].lower() if "." in f.filename else ""
            if ext not in ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "mp4", "png", "jpg", "jpeg", "zip"]:
                print(f"[BULK UPLOAD ERROR] Invalid mime type/extension for {f.filename}")
                failed_count += 1
                continue

            content_str = f.file
            if "," in content_str:
                content_str = content_str.split(",")[1]
            file_bytes = base64.b64decode(content_str)
            file_size_bytes = len(file_bytes)
            
            if file_size_bytes == 0:
                print(f"[BULK UPLOAD ERROR] Empty file bytes decoded for {f.filename}")
                failed_count += 1
                continue

            # 3. Validate category exists OR create category
            category_name = f.category.strip()
            if not category_name:
                print(f"[BULK UPLOAD ERROR] Empty category for {f.filename}")
                failed_count += 1
                continue
                
            category_lower = category_name.lower()
            if category_lower not in added_categories:
                cat_stmt = select(ContentCategory).where(func.lower(ContentCategory.name) == category_lower)
                cat_res = await db.execute(cat_stmt)
                category_obj = cat_res.scalar_one_or_none()
                if not category_obj:
                    category_obj = ContentCategory(name=category_name)
                    db.add(category_obj)
                    await db.flush()
                added_categories.add(category_lower)

            # Generate path
            unique_filename = f"{uuid.uuid4().hex}.{ext}"
            category_folder = category_name.replace(" ", "_")
            storage_path = f"{category_folder}/{unique_filename}"
            content_type = get_mime_type(f.filename)
            
            # Ensure folder exists in storage (though storage doesn't strictly need folders, it's good practice)
            await ensure_supabase_folder_exists(category_name)
            
            # Upload
            success, public_url, err_msg = await upload_file_to_supabase(
                file_bytes=file_bytes,
                file_path=storage_path,
                content_type=content_type
            )
            
            if not success:
                print(f"[BULK UPLOAD ERROR] Supabase upload failed for {f.filename}: {err_msg}")
                failed_count += 1
                continue
                
            # Verify
            exists = await verify_file_exists_in_supabase(storage_path)
            if not exists:
                print(f"[BULK UPLOAD ERROR] Supabase verification failed for {f.filename}")
                failed_count += 1
                continue
                
            # DB entry
            new_item = ContentItem(
                title=f.filename.rsplit(".", 1)[0] if "." in f.filename else f.filename,
                description=f"Bulk uploaded file {f.filename}",
                category=category_name,
                folder="General",
                file_type=get_file_type_from_name(f.filename),
                file_size=format_file_size(file_size_bytes),
                storage_path=storage_path,
                public_url=public_url,
                uploaded_by=current_user.full_name or "Admin",
                is_active=True,
                storage_provider="Supabase",
                bucket_name=BUCKET_NAME,
                original_filename=f.filename,
                storage_filename=unique_filename,
                mime_type=content_type,
                visibility=payload.visibility or "owner_employee"
            )
            db.add(new_item)
            success_count += 1
            
        except Exception as e:
            print(f"[BULK UPLOAD ERROR] Exception processing {f.filename}: {e}")
            failed_count += 1
            
    if success_count > 0:
        await db.commit()
        cache_invalidate_all()
        
    return {
        "success": True,
        "uploaded": success_count,
        "failed": failed_count
    }
