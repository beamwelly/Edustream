import os
from datetime import datetime, timedelta, timezone
from typing import Union
import bcrypt
from jose import jwt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
# Provide a secure default if SECRET_KEY is not defined or is blank
if not SECRET_KEY:
    SECRET_KEY = "edustream_calm_and_modern_platform_secret_key_2026"

ALGORITHM = os.getenv("ALGORITHM", "HS256")

try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
except (ValueError, TypeError):
    ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Raw bcrypt utilities (avoiding passlib version compatibility bugs)
def hash_password(password: str) -> str:
    """
    Hashes a plain text password using raw bcrypt.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a hashed password.
    """
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

# JWT utilities
def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None) -> str:
    """
    Generates a JWT access token containing the provided dictionary claims.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Union[dict, None]:
    """
    Decodes and validates a JWT token. Returns the payload if valid, otherwise None.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
