"""
Settings router — full CRUD for user privacy, security, and notification settings.
"""
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.settings import SettingsResponse, SettingsUpdate, ChangePasswordRequest
from app.services.auth_service import verify_password, hash_password

router = APIRouter()


def _get_or_create_settings(db: Session, user_id: int) -> UserSettings:
    """Get existing settings or create defaults for the user."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=SettingsResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's settings."""
    settings = _get_or_create_settings(db, current_user.id)
    return SettingsResponse.model_validate(settings)


@router.put("", response_model=SettingsResponse)
def update_settings(
    updates: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's settings (partial update)."""
    settings = _get_or_create_settings(db, current_user.id)

    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(settings, field):
            setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return SettingsResponse.model_validate(settings)


def _validate_strong_password(password: str) -> str | None:
    """Validate password is strong and max 8 characters.
    Returns error message or None if valid.
    """
    if len(password) > 8:
        return "Password must be at most 8 characters"
    if len(password) < 4:
        return "Password must be at least 4 characters"
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r"[0-9]", password):
        return "Password must contain at least one digit"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/~`]", password):
        return "Password must contain at least one special character"
    return None


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the current user's password."""
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Validate new password strength
    error = _validate_strong_password(request.new_password)
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error,
        )

    # Update password
    current_user.password_hash = hash_password(request.new_password)
    db.commit()

    return {"message": "Password changed successfully"}
