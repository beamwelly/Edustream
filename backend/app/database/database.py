import os
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_async_db_url(url: str) -> str:
    """
    Parses and sanitizes the database URL.
    - Ensures the scheme is 'postgresql+asyncpg://' for asynchronous connections.
    - Strips unsupported query parameters (e.g. sslmode, channel_binding) for compatibility with asyncpg.
    """
    if not url:
        raise ValueError("DATABASE_URL environment variable is not set in the environment or .env file")
    
    # Convert standard postgresql URL to asyncpg
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    parsed = urlparse(url)
    q_params = parse_qsl(parsed.query)
    
    # Filter out asyncpg-incompatible parameters (e.g., sslmode, channel_binding)
    # asyncpg handles SSL via connection options; standard sslmode query param is not supported.
    filtered_params = [
        (k, v) for k, v in q_params 
        if k not in ("sslmode", "channel_binding")
    ]
    
    new_query = urlencode(filtered_params)
    parsed = parsed._replace(query=new_query)
    return urlunparse(parsed)

# Prepare the async connection string
async_database_url = get_async_db_url(DATABASE_URL)

# Create a production-ready asynchronous SQLAlchemy engine
engine = create_async_engine(
    async_database_url,
    echo=False,             # Set to True in development if query logging is desired
    pool_size=10,           # Maximum number of connections to keep in the pool
    max_overflow=20,        # Maximum number of connections to create beyond pool_size
    pool_pre_ping=True,     # Verifies connection health before utilizing from pool
    pool_recycle=1800,      # Recycle connections after 30 minutes to prevent stale sockets
    connect_args={"ssl": True},
)

# Async session maker for dependency injection
# SessionLocal is the name specified in the requirements.
# AsyncSessionLocal is provided as an alias for full compatibility.
SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

AsyncSessionLocal = SessionLocal
