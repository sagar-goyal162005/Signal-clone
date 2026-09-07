"""
Contact schemas — request/response models for contact management.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ContactCreate(BaseModel):
    contact_user_id: int


class ContactResponse(BaseModel):
    id: int
    owner_id: int
    contact_user_id: int
    contact_username: str
    contact_display_name: Optional[str] = None
    contact_avatar_url: Optional[str] = None
    contact_is_online: bool = False
    contact_last_seen: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
