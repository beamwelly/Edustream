import asyncio
from sqlalchemy import text
from app.database.database import SessionLocal, engine

async def migrate():
    print("Connecting to the database for masterclass migration...")
    async with SessionLocal() as session:
        try:
            # Add recording_type
            print("Adding recording_type column if not exists...")
            await session.execute(text(
                "ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS recording_type VARCHAR(50) DEFAULT 'zoom';"
            ))
            
            # Add recording_file_path
            print("Adding recording_file_path column if not exists...")
            await session.execute(text(
                "ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS recording_file_path TEXT;"
            ))
            
            # Add recording_public_url
            print("Adding recording_public_url column if not exists...")
            await session.execute(text(
                "ALTER TABLE masterclasses ADD COLUMN IF NOT EXISTS recording_public_url TEXT;"
            ))
            
            # Set default recording_type for existing records
            print("Setting default recording_type for existing records...")
            await session.execute(text(
                "UPDATE masterclasses SET recording_type = 'zoom' WHERE recording_type IS NULL;"
            ))
            
            await session.commit()
            print("Migration completed successfully!")
        except Exception as e:
            await session.rollback()
            print(f"Error executing migration: {e}")
        finally:
            await session.close()
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
