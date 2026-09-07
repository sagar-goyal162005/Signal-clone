"""
Group schemas — request/response models for group management.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    member_ids: List[int] = Field(..., min_length=1)
    avatar_url: Optional[str] = None


class GroupMemberAdd(BaseModel):
    user_id: int


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    avatar_url: Optional[str] = None
