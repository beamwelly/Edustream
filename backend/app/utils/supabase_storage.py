import os
import httpx
import logging
from typing import Optional, Tuple, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("supabase_storage")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET")

# Format URL to ensure no double slashes
if SUPABASE_URL:
    SUPABASE_URL = SUPABASE_URL.rstrip("/")

# Strict startup validation logs
if not SUPABASE_URL:
    logger.warning("✗ Supabase URL (SUPABASE_URL) missing from environment variables!")
else:
    print("✓ Supabase URL loaded")

if not SUPABASE_SERVICE_ROLE_KEY:
    logger.warning("✗ Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY) missing from environment variables!")
else:
    print("✓ Service Role Key loaded")

if not SUPABASE_BUCKET:
    logger.warning("✗ Supabase Bucket name (SUPABASE_BUCKET) missing from environment variables!")
else:
    print("✓ Bucket loaded")

BUCKET_NAME = SUPABASE_BUCKET

async def ensure_bucket_exists():
    """
    Ensures that the dynamic storage bucket exists in Supabase.
    If it doesn't, attempts to create it programmatically with appropriate permissions.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase environment variables are missing. Storage actions will fail.")
        return

    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            # Check if bucket exists
            check_url = f"{SUPABASE_URL}/storage/v1/bucket/{BUCKET_NAME}"
            res = await client.get(check_url, headers=headers)
            if res.status_code == 200:
                logger.info(f"Supabase storage bucket '{BUCKET_NAME}' already exists.")
                return

            # Bucket doesn't exist, create it (omit hardcoded size limit to inherit plan bounds)
            create_url = f"{SUPABASE_URL}/storage/v1/bucket"
            payload = {
                "id": BUCKET_NAME,
                "name": BUCKET_NAME,
                "public": True
            }
            create_res = await client.post(create_url, json=payload, headers=headers)
            if create_res.status_code == 200:
                logger.info(f"Successfully created public Supabase storage bucket '{BUCKET_NAME}'.")
            else:
                logger.error(f"Failed to create bucket: status {create_res.status_code}, response: {create_res.text}")
        except Exception as e:
            logger.error(f"Exception checking/creating Supabase bucket: {str(e)}")


async def upload_file_to_supabase(
    file_bytes: bytes,
    file_path: str,
    content_type: str
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Uploads a file's raw bytes to the Supabase storage bucket.
    
    Returns:
        (success, public_url, error_message)
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return False, None, "Supabase environment variables are not configured."

    # Clean file path to prevent URL encoding glitches
    file_path_clean = file_path.lstrip("/")
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{file_path_clean}"

    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": content_type
    }

    # Debugging logs as explicitly requested
    filename = file_path_clean.split("/")[-1] if "/" in file_path_clean else file_path_clean
    print(f"Uploading: bucket={BUCKET_NAME}, path={file_path_clean}, filename={filename}")

    async with httpx.AsyncClient() as client:
        try:
            # POST upload request
            res = await client.post(upload_url, content=file_bytes, headers=headers, timeout=60.0)
            
            # Debugging logs for response as explicitly requested
            print(f"Supabase Response: status={res.status_code}, body={res.text}")

            if res.status_code == 200:
                # Construct public access URL
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{file_path_clean}"
                return True, public_url, None
            else:
                # Explicitly log the actual error body returned by Supabase
                logger.error(f"Supabase upload rejected! URL: {upload_url}, Status: {res.status_code}, Body: {res.text}")
                return False, None, f"Supabase responded with {res.status_code}: {res.text}"
        except Exception as e:
            return False, None, f"Supabase upload request failed: {str(e)}"

async def delete_file_from_supabase(file_path: str) -> Tuple[bool, Optional[str]]:
    """
    Removes a file from the Supabase storage bucket.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return False, "Supabase environment variables are not configured."

    file_path_clean = file_path.lstrip("/")
    delete_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{file_path_clean}"

    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.delete(delete_url, headers=headers)
            if res.status_code == 200 or res.status_code == 404:
                # 404 is considered a success here since the goal is that the file is gone
                return True, None
            else:
                return False, f"Supabase responded with {res.status_code}: {res.text}"
        except Exception as e:
            return False, f"Supabase delete request failed: {str(e)}"

async def download_file_from_supabase(file_path: str) -> Tuple[Optional[bytes], Optional[str]]:
    """
    Downloads file binary contents from Supabase Storage.
    Useful for secure backend-mediated streaming and preview downloads.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None, "Supabase environment variables are not configured."

    file_path_clean = file_path.lstrip("/")
    download_url = f"{SUPABASE_URL}/storage/v1/object/authenticated/{BUCKET_NAME}/{file_path_clean}"

    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(download_url, headers=headers, timeout=60.0)
            if res.status_code == 200:
                return res.content, None
            else:
                return None, f"Supabase download responded with {res.status_code}"
        except Exception as e:
            return None, f"Supabase download request failed: {str(e)}"

async def create_signed_url(file_path: str, expires_in: int = 3600) -> Tuple[Optional[str], Optional[str]]:
    """
    Generates a temporary signed URL for a file in the private Supabase Storage bucket.
    
    Returns:
        (signed_url, error_message)
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None, "Supabase environment variables are not configured."

    file_path_clean = file_path.lstrip("/")
    sign_url = f"{SUPABASE_URL}/storage/v1/object/sign/{BUCKET_NAME}/{file_path_clean}"

    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "expiresIn": expires_in
    }

    # Debugging logs as explicitly requested
    print(f"[DEBUG SIGNED URL] Bucket: {BUCKET_NAME}")
    print(f"[DEBUG SIGNED URL] Stored Path: {file_path_clean}")
    print(f"[DEBUG SIGNED URL] Sign Request URL: {sign_url}")

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(sign_url, json=payload, headers=headers, timeout=30.0)
            print(f"[DEBUG SIGNED URL] Supabase Response Code: {res.status_code}")
            
            if res.status_code == 200:
                data = res.json()
                
                # Critical bug fix: support both signedURL and signedUrl casings
                signed_url_path = data.get("signedURL") or data.get("signedUrl")
                
                # Debugging logs as explicitly requested
                print("Raw Response:", data)
                print("Signed URL:", signed_url_path)
                
                if signed_url_path:
                    # Enforce proper slash prefixing
                    if not signed_url_path.startswith("/"):
                        signed_url_path = f"/{signed_url_path}"
                    
                    # Construct absolute URL correctly
                    if "/storage/v1" in signed_url_path:
                        absolute_signed_url = f"{SUPABASE_URL}{signed_url_path}"
                    else:
                        absolute_signed_url = f"{SUPABASE_URL}/storage/v1{signed_url_path}"
                    
                    print("Full URL:", absolute_signed_url)
                    return absolute_signed_url, None
                else:
                    return None, "Response did not contain signedURL or signedUrl keys."
            else:
                return None, f"Supabase responded with {res.status_code}: {res.text}"
        except Exception as e:
            print(f"[DEBUG SIGNED URL] Exception generating signed URL: {str(e)}")
            return None, f"Supabase sign request failed: {str(e)}"

async def verify_file_exists_in_supabase(file_path: str) -> bool:
    """
    Queries the object metadata endpoint in Supabase to confirm a file actually exists.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return False

    file_path_clean = file_path.lstrip("/")
    info_url = f"{SUPABASE_URL}/storage/v1/object/info/{BUCKET_NAME}/{file_path_clean}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(info_url, headers=headers)
            if res.status_code == 200:
                return True
            logger.warning(f"Storage verification failed: path '{file_path_clean}' returned code {res.status_code}")
            return False
        except Exception as e:
            logger.error(f"Exception verifying storage file existence: {str(e)}")
            return False

async def list_all_files_in_supabase() -> List[str]:
    """
    Recursively scans and lists all storage paths inside the active bucket.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []

    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    all_files = []
    list_url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
    
    async with httpx.AsyncClient() as client:
        try:
            # 1. Get root folders
            root_payload = {"prefix": "", "limit": 100}
            res = await client.post(list_url, json=root_payload, headers=headers)
            
            if res.status_code == 200:
                root_items = res.json()
                for item in root_items:
                    name = item.get("name")
                    if not name:
                        continue
                    
                    # Directories have no file ID in Supabase list payload
                    if not item.get("id"):
                        # Get files recursively inside folder
                        dir_payload = {"prefix": f"{name}/", "limit": 500}
                        dir_res = await client.post(list_url, json=dir_payload, headers=headers)
                        if dir_res.status_code == 200:
                            for file_item in dir_res.json():
                                file_name = file_item.get("name")
                                if file_name and file_item.get("id"):
                                    all_files.append(f"{name}/{file_name}")
                    else:
                        # Direct file in root
                        all_files.append(name)
            return all_files
        except Exception as e:
            logger.error(f"Failed to scan Supabase files recursively: {str(e)}")
            return []


async def ensure_supabase_folder_exists(category_name: str) -> bool:
    """
    Guarantees a virtual folder exists in Supabase storage for the given category name
    by placing a tiny '.keep' placeholder if it doesn't already exist.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return False
        
    folder_prefix = category_name.strip().replace(" ", "_")
    placeholder_path = f"{folder_prefix}/.keep"
    
    # 1. Check if the .keep file already exists in the bucket
    exists = await verify_file_exists_in_supabase(placeholder_path)
    if exists:
        return True
        
    # 2. Upload a tiny placeholder to force Supabase folder UI visibility
    success, _, _ = await upload_file_to_supabase(
        file_bytes=b"placeholder",
        file_path=placeholder_path,
        content_type="text/plain"
    )
    return success

