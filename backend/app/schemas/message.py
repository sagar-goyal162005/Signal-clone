"""
Message schemas — request/response models for messaging.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    message_type: str = Field("TEXT", pattern="^(TEXT|IMAGE|FILE|SYSTEM)$")
    reply_to_id: Optional[int] = None


class MessageUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ReceiptResponse(BaseModel):
    user_id: int
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True


class SenderResponse(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender: Optional[SenderResponse] = None
    content: str
    message_type: str
    reply_to_id: Optional[int] = None
    created_at: datetime
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    receipts: List[ReceiptResponse] = []
    status: str = "SENT"  # Computed: SENDING, SENT, DELIVERED, READ

    class Config:
        from_attributes = True


class MessagesListResponse(BaseModel):
    messages: List[MessageResponse]
    has_more: bool = False
    total: int = 0
