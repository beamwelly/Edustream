from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import SessionLocal

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection for FastAPI routes to get an asynchronous database session.
    Ensures that the session is automatically closed and transactions are safely
    managed (rolled back on exception).
    """
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
