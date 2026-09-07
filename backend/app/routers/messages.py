"""
Messages router — CRUD for messages within conversations.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.message import MessageCreate, MessageUpdate, MessageResponse, MessagesListResponse
from app.schemas.auth import MessageResponse as MsgResp
from app.services.message_service import (
    create_message, get_conversation_messages,
    update_message, delete_message,
    mark_messages_read,
)
from app.services.conversation_service import is_conversation_member
from app.websocket.manager import manager

router = APIRouter()


@router.get("/conversations/{conversation_id}/messages", response_model=MessagesListResponse)
def get_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get messages for a conversation with pagination."""
    if not is_conversation_member(db, conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this conversation",
        )

    messages, has_more, total = get_conversation_messages(db, conversation_id, limit, before_id)
    return MessagesListResponse(messages=messages, has_more=has_more, total=total)


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to a conversation."""
    if not is_conversation_member(db, conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this conversation",
        )

    message = create_message(
        db, conversation_id, current_user.id,
        request.content, request.message_type, request.reply_to_id,
    )

    # Broadcast in real time via WebSocket to all members
    await manager.broadcast_to_conversation(
        db=db,
        conversation_id=conversation_id,
        data={
            "type": "message",
            "conversation_id": conversation_id,
            "message": message,
        },
    )

    # Stop typing indicator for sender
    await manager.broadcast_to_conversation(
        db=db,
        conversation_id=conversation_id,
        data={
            "type": "typing_stop",
            "conversation_id": conversation_id,
            "user_id": current_user.id,
        },
        exclude_user_id=current_user.id,
    )

    return message


@router.patch("/messages/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: int,
    request: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit a message. Only the sender can edit."""
    try:
        message = update_message(db, message_id, current_user.id, request.content)
        await manager.broadcast_to_conversation(
            db=db,
            conversation_id=message["conversation_id"],
            data={
                "type": "message_updated",
                "conversation_id": message["conversation_id"],
                "message": message,
            },
        )
        return message
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.delete("/messages/{message_id}", response_model=MsgResp)
async def remove_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft delete a message. Only the sender can delete."""
    try:
        conversation_id = delete_message(db, message_id, current_user.id)
        await manager.broadcast_to_conversation(
            db=db,
            conversation_id=conversation_id,
            data={
                "type": "message_deleted",
                "conversation_id": conversation_id,
                "message_id": message_id,
            },
        )
        return MsgResp(message="Message deleted")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/conversations/{conversation_id}/read", response_model=MsgResp)
async def mark_read(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all messages in a conversation as read."""
    if not is_conversation_member(db, conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this conversation",
        )

    affected_ids = mark_messages_read(db, conversation_id, current_user.id)
    if affected_ids:
        from datetime import datetime, timezone
        await manager.broadcast_to_conversation(
            db=db,
            conversation_id=conversation_id,
            data={
                "type": "message_read",
                "conversation_id": conversation_id,
                "user_id": current_user.id,
                "message_ids": affected_ids,
                "read_at": datetime.now(timezone.utc).isoformat(),
            },
        )
    return MsgResp(message=f"Marked {len(affected_ids)} messages as read")
