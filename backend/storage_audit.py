import asyncio
from sqlalchemy import select
from app.database.database import SessionLocal, engine
from app.models.content import ContentItem
from app.utils.supabase_storage import list_all_files_in_supabase, verify_file_exists_in_supabase

async def run_audit():
    print("====================================================")
    print("           EDU-STREAM STORAGE AUDIT TOOL            ")
    print("====================================================")
    print("Connecting to the database...")
    
    async with SessionLocal() as db:
        try:
            # 1. Fetch all content items from DB
            stmt = select(ContentItem)
            result = await db.execute(stmt)
            db_items = result.scalars().all()
            total_files = len(db_items)
            
            print(f"Retrieved {total_files} file records from database.")
            print("Scanning Supabase storage bucket...")
            
            # 2. Retrieve all files currently in Supabase
            supabase_files = await list_all_files_in_supabase()
            # Normalize listed paths to lowercase for robust match check
            existing_paths = {f.strip().lower() for f in supabase_files}
            
            print(f"Retrieved {len(supabase_files)} files from Supabase bucket.")
            print("Running consistency audit...")
            
            missing_items = []
            
            for idx, item in enumerate(db_items, start=1):
                path = item.storage_path.strip()
                path_lower = path.lower()
                
                # Check if it exists in list. If not, double check directly via info endpoint
                exists = path_lower in existing_paths
                if not exists:
                    # Double check via info endpoint to handle listing edge cases
                    exists = await verify_file_exists_in_supabase(path)
                
                if not exists:
                    missing_items.append({
                        "id": item.id,
                        "title": item.title,
                        "storage_path": path,
                        "category": item.category,
                        "folder": item.folder
                    })
                
                if idx % 10 == 0 or idx == total_files:
                    print(f"Audited {idx}/{total_files} items...")
            
            # Print report
            print("\n================ AUDIT REPORT ================")
            print(f"Total files counted:    {total_files}")
            print(f"Missing in bucket count: {len(missing_items)}")
            print("----------------------------------------------")
            if missing_items:
                print("Missing storage paths:")
                for m in missing_items:
                    print(f" - [ID: {m['id']}] '{m['title']}' at path: {m['storage_path']} (Category: {m['category']}, Folder: {m['folder']})")
            else:
                print("No missing files! Database and Supabase storage are fully consistent.")
            print("==============================================\n")
            
        except Exception as e:
            print(f"Error during storage audit: {e}")
        finally:
            await db.close()
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_audit())
