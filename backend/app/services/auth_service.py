from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.user import User
from app.utils.security import verify_password, create_access_token

async def authenticate_user(db: AsyncSession, email: str, password: str, role: str = None):
    """
    Authenticates a user against database credentials and validates the role.
    
    Returns:
        tuple: (auth_data, error_message)
            - auth_data: Dictionary containing access_token and user info if successful; None otherwise.
            - error_message: Error string explaining failure; None if successful.
    """
    email_clean = email.strip().lower()
    stmt = select(User).where(func.lower(User.email) == email_clean)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        return None, "Invalid email or password"
    
    # 2. Check password validity
    if not verify_password(password, user.hashed_password):
        return None, "Invalid email or password"
    
    # 3. Verify user is active
    if not user.is_active:
        return None, "Your account is currently inactive. Please contact your administrator."
    
    # 4. Generate access token with specified claims (user_id, role, email)
    token_claims = {
        "sub": str(user.id),
        "user_id": user.id,
        "role": user.role,
        "email": user.email
    }
    
    access_token = create_access_token(data=token_claims)
    
    org_name = user.company_name
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "organization_id": user.organization_id,
            "organization_name": org_name,
            "is_temp_password": user.is_temp_password,
            "is_active": user.is_active
        }
    }, None
