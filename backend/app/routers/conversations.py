"""
Conversations router — create and list conversations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.conversation import ConversationCreate, ConversationResponse
from app.services.conversation_service import (
    get_or_create_direct_conversation,
    create_group_conversation,
    get_user_conversations,
    get_conversation_by_id,
)

from app.websocket.manager import manager

router = APIRouter()


@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all conversations for the current user, sorted by latest activity."""
    conversations = get_user_conversations(db, current_user.id)
    return conversations


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new conversation (direct or group)."""
    try:
        if request.type == "DIRECT":
            target_id = request.target_user_id
            if not target_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="participant_id or recipient_id required for direct conversations",
                )
            conv = get_or_create_direct_conversation(db, current_user.id, target_id)
        else:
            if not request.name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="name required for group conversations",
                )
            member_ids = request.member_ids or []
            conv = create_group_conversation(db, current_user.id, request.name, member_ids)

        result = get_conversation_by_id(db, conv.id, current_user.id)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to retrieve conversation")

        # Broadcast conversation_created event to other members
        for member in conv.members:
            if member.user_id != current_user.id:
                member_conv = get_conversation_by_id(db, conv.id, member.user_id)
                if member_conv:
                    await manager.send_personal_message(
                        {
                            "type": "conversation_created",
                            "conversation": member_conv,
                        },
                        member.user_id,
                    )

        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific conversation by ID."""
    result = get_conversation_by_id(db, conversation_id, current_user.id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you are not a member",
        )
    return result
