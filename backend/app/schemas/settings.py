"""
Settings schemas — request/response models for user settings.
"""
from pydantic import BaseModel
from typing import Optional


class SettingsResponse(BaseModel):
    read_receipts: bool = True
    typing_indicators: bool = True
    link_previews: bool = False
    screen_security: bool = True
    incognito_keyboard: bool = True
    registration_lock: bool = True
    disappearing_messages_timer: str = "off"
    notifications_enabled: bool = True
    notification_sound: bool = True
    notification_previews: bool = True

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    read_receipts: Optional[bool] = None
    typing_indicators: Optional[bool] = None
    link_previews: Optional[bool] = None
    screen_security: Optional[bool] = None
    incognito_keyboard: Optional[bool] = None
    registration_lock: Optional[bool] = None
    disappearing_messages_timer: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    notification_sound: Optional[bool] = None
    notification_previews: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
