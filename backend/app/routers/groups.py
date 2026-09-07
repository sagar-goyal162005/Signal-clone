"""
Groups router — group creation, member management, admin controls.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.group import GroupCreate, GroupMemberAdd, GroupUpdate
from app.schemas.auth import MessageResponse
from app.services.group_service import (
    get_group_details, add_group_member, remove_group_member, update_group,
)
from app.services.conversation_service import create_group_conversation, get_conversation_by_id
from app.websocket.manager import manager

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_group(
    request: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new group conversation and broadcast to all members."""
    conv = create_group_conversation(
        db, current_user.id, request.name, request.member_ids, request.avatar_url
    )

    # Notify all other group members in real time via WebSocket
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

    return get_group_details(db, conv.id, current_user.id)


@router.get("/{group_id}")
def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get group details with member list."""
    details = get_group_details(db, group_id, current_user.id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or you are not a member",
        )
    return details


@router.patch("/{group_id}")
async def update_group_details(
    group_id: int,
    request: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update group name or avatar. Admin only."""
    try:
        updated = update_group(db, group_id, current_user.id, request.name, request.avatar_url)
        # Broadcast group details update to conversation members
        details = get_group_details(db, group_id, current_user.id)
        await manager.broadcast_to_conversation(
            db=db,
            conversation_id=group_id,
            data={
                "type": "group_updated",
                "conversation_id": group_id,
                "group": details,
            },
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{group_id}/members")
async def add_member(
    group_id: int,
    request: GroupMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a member to the group. Admin only."""
    try:
        member = add_group_member(db, group_id, current_user.id, request.user_id)
        # Notify the newly added user with the full conversation
        new_conv = get_conversation_by_id(db, group_id, request.user_id)
        if new_conv:
            await manager.send_personal_message(
                {
                    "type": "conversation_created",
                    "conversation": new_conv,
                },
                request.user_id,
            )

        # Notify existing members of member update
        details = get_group_details(db, group_id, current_user.id)
        await manager.broadcast_to_conversation(
            db=db,
            conversation_id=group_id,
            data={
                "type": "group_updated",
                "conversation_id": group_id,
                "group": details,
            },
        )
        return member
    except ValueError as e:
        status_code = status.HTTP_403_FORBIDDEN if "admin" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(e))


@router.delete("/{group_id}/members/{user_id}", response_model=MessageResponse)
async def remove_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member from the group. Admin only (or self-leave)."""
    try:
        remove_group_member(db, group_id, current_user.id, user_id)
        # Notify removed user
        await manager.send_personal_message(
            {
                "type": "conversation_deleted",
                "conversation_id": group_id,
            },
            user_id,
        )

        # Broadcast update to remaining members
        details = get_group_details(db, group_id, current_user.id)
        if details:
            await manager.broadcast_to_conversation(
                db=db,
                conversation_id=group_id,
                data={
                    "type": "group_updated",
                    "conversation_id": group_id,
                    "group": details,
                },
            )
        return MessageResponse(message="Member removed")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
