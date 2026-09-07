"""
User service — handles user profile operations and search.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.user import User


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def update_user_profile(
    db: Session,
    user: User,
    display_name: Optional[str] = None,
    phone: Optional[str] = None,
    avatar_url: Optional[str] = None,
    about: Optional[str] = None,
) -> User:
    """Update user profile fields."""
    if display_name is not None:
        user.display_name = display_name
    if phone is not None:
        # Check phone uniqueness
        if phone:
            existing = db.query(User).filter(User.phone == phone, User.id != user.id).first()
            if existing:
                raise ValueError("Phone number already in use")
        user.phone = phone
    if avatar_url is not None:
        user.avatar_url = avatar_url
    if about is not None:
        user.about = about

    db.commit()
    db.refresh(user)
    return user


def search_users(db: Session, query: str, current_user_id: int, limit: int = 20) -> List[User]:
    """Search users by username or display name, excluding the current user."""
    if not query or len(query) < 1:
        return []

    search_term = f"%{query}%"
    return (
        db.query(User)
        .filter(
            User.id != current_user_id,
            User.is_verified == True,
            or_(
                User.username.ilike(search_term),
                User.display_name.ilike(search_term),
            ),
        )
        .limit(limit)
        .all()
    )


def set_user_online(db: Session, user_id: int) -> None:
    """Mark user as online."""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_online = True
        db.commit()


def set_user_offline(db: Session, user_id: int) -> None:
    """Mark user as offline and record last seen time."""
    from datetime import datetime, timezone
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_online = False
        user.last_seen = datetime.now(timezone.utc)
        db.commit()
