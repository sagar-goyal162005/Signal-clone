"""
Conversation schemas — request/response models for conversations.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ConversationCreate(BaseModel):
    type: str = Field("DIRECT", pattern="^(DIRECT|GROUP)$")
    participant_id: Optional[int] = None  # For DIRECT conversations
    recipient_id: Optional[int] = None  # Alias for participant_id
    name: Optional[str] = None  # For GROUP conversations
    member_ids: Optional[List[int]] = None  # For GROUP conversations

    @property
    def target_user_id(self) -> Optional[int]:
        return self.participant_id or self.recipient_id


class ConversationMemberResponse(BaseModel):
    user_id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_online: bool = False
    role: str = "MEMBER"

    class Config:
        from_attributes = True


class LastMessageResponse(BaseModel):
    id: int
    content: str
    sender_id: int
    sender_name: Optional[str] = None
    created_at: datetime
    message_type: str = "TEXT"

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    type: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    members: List[ConversationMemberResponse] = []
    last_message: Optional[LastMessageResponse] = None
    unread_count: int = 0

    class Config:
        from_attributes = True
