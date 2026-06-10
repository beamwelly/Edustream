import os
import asyncio
import bcrypt
from sqlalchemy import select
from app.database.database import SessionLocal, engine
from app.models.user import User

async def create_superadmin():
    # Credentials for the admin
    full_name = os.getenv("ADMIN_NAME", "Admin")
    email = os.getenv("ADMIN_EMAIL", "admin@edustream.com")
    password = os.getenv("ADMIN_PASSWORD", "Admin@123")
    
    # Hash the password directly using bcrypt to avoid passlib version conflicts
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    print("Connecting to the database...")
    async with SessionLocal() as session:
        try:
            # Check if any admin already exists in the database
            stmt = select(User).where(User.role == "admin")
            result = await session.execute(stmt)
            existing_super = result.scalar_one_or_none()
            
            if existing_super:
                print(f"Admin already exists in the database: {existing_super.email}")
                print(f"Updating admin email to '{email}' and updating password...")
                
                existing_super.email = email
                existing_super.full_name = full_name
                existing_super.hashed_password = hashed_password
                
                await session.commit()
                print("Successfully updated existing admin credentials in the database!")
                return
            
            # Verify the email is not taken by another user
            stmt_email = select(User).where(User.email == email)
            result_email = await session.execute(stmt_email)
            existing_email = result_email.scalar_one_or_none()
            if existing_email:
                print(f"Email '{email}' is taken by role '{existing_email.role}'. Promoting to admin...")
                existing_email.role = "admin"
                existing_email.full_name = full_name
                existing_email.hashed_password = hashed_password
                existing_email.company_name = "EduStream"
                existing_email.is_active = True
                await session.commit()
                print("Successfully promoted existing user to admin role!")
                return
            
            # Instantiate the admin User (organization_id is None)
            new_super = User(
                full_name=full_name,
                email=email,
                hashed_password=hashed_password,
                role="admin",
                organization_id=None,
                is_active=True,
                is_temp_password=False
            )
            
            session.add(new_super)
            await session.commit()
            print(f"Successfully created admin user!")
            print(f"Email: {email}")
            print(f"Role: admin")
            print(f"Password: {password}")
            
        except Exception as e:
            await session.rollback()
            print(f"An error occurred while creating/updating the admin: {e}")
        finally:
            await session.close()
            # Clean up engine connection pool
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_superadmin())