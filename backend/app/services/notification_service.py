from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.notification import Notification

async def create_notification(
    db: AsyncSession,
    title: str,
    message: str,
    type: str,
    reference_id: Optional[str] = None,
    user_id: Optional[int] = None,
    target_group: Optional[str] = None  # "users", "admins"
):
    """
    Creates notifications for a specific user, or groups of users/admins.
    """
    if user_id is not None:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            reference_id=reference_id
        )
        db.add(notif)
    elif target_group == "users":
        stmt = select(User)
        res = await db.execute(stmt)
        users = res.scalars().all()
        for u in users:
            notif = Notification(
                user_id=u.id,
                title=title,
                message=message,
                type=type,
                reference_id=reference_id
            )
            db.add(notif)
    elif target_group == "admins":
        stmt = select(User).where(User.role == "admin")
        res = await db.execute(stmt)
        admins = res.scalars().all()
        for a in admins:
            notif = Notification(
                user_id=a.id,
                title=title,
                message=message,
                type=type,
                reference_id=reference_id
            )
            db.add(notif)
    await db.commit()
