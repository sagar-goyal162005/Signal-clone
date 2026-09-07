"""
Settings router — placeholder settings endpoints.
"""
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("")
def get_settings(current_user: User = Depends(get_current_user)):
    """Get user settings."""
    return {
        "privacy": {
            "read_receipts": True,
            "typing_indicators": True,
            "last_seen": "everyone",
            "profile_photo": "everyone",
        },
        "notifications": {
            "message_notifications": True,
            "show_previews": True,
            "sound": True,
            "call_notifications": True,
        },
        "appearance": {
            "theme": "light",
            "language": "en",
            "font_size": "medium",
            "chat_wallpaper": None,
        },
        "chats": {
            "enter_sends_message": True,
            "media_auto_download": True,
        },
    }


@router.patch("")
def update_settings(current_user: User = Depends(get_current_user)):
    """Update user settings (placeholder)."""
    return {"message": "Settings updated"}
