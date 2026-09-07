"""
Conversation service — manages direct and group conversations.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from app.models.conversation import Conversation
from app.models.conversation_member import ConversationMember
from app.models.message import Message
from app.models.message_receipt import MessageReceipt
from app.models.user import User


def get_or_create_direct_conversation(db: Session, user_id: int, other_user_id: int) -> Conversation:
    """Get existing direct conversation between two users, or create one.
    Prevents duplicate direct conversations."""
    # Find existing direct conversation
    existing = (
        db.query(Conversation)
        .join(ConversationMember, Conversation.id == ConversationMember.conversation_id)
        .filter(
            Conversation.type == "DIRECT",
            ConversationMember.user_id == user_id,
        )
        .all()
    )

    for conv in existing:
        member_ids = [m.user_id for m in conv.members]
        if set(member_ids) == {user_id, other_user_id}:
            return conv

    # Verify other user exists
    other_user = db.query(User).filter(User.id == other_user_id).first()
    if not other_user:
        raise ValueError("User not found")

    # Create new direct conversation
    conversation = Conversation(type="DIRECT", created_by=user_id)
    db.add(conversation)
    db.flush()

    # Add both members
    db.add(ConversationMember(conversation_id=conversation.id, user_id=user_id, role="MEMBER"))
    db.add(ConversationMember(conversation_id=conversation.id, user_id=other_user_id, role="MEMBER"))
    db.commit()
    db.refresh(conversation)
    return conversation


def create_group_conversation(
    db: Session, creator_id: int, name: str, member_ids: List[int], avatar_url: Optional[str] = None
) -> Conversation:
    """Create a new group conversation with the creator as admin."""
    conversation = Conversation(
        type="GROUP",
        name=name,
        avatar_url=avatar_url,
        created_by=creator_id,
    )
    db.add(conversation)
    db.flush()

    # Add creator as admin
    db.add(ConversationMember(conversation_id=conversation.id, user_id=creator_id, role="ADMIN"))

    # Add other members
    for member_id in member_ids:
        if member_id != creator_id:
            user = db.query(User).filter(User.id == member_id).first()
            if user:
                db.add(ConversationMember(
                    conversation_id=conversation.id, user_id=member_id, role="MEMBER"
                ))

    # Add system message for group creation
    system_msg = Message(
        conversation_id=conversation.id,
        sender_id=creator_id,
        content=f"Group \"{name}\" created",
        message_type="SYSTEM",
    )
    db.add(system_msg)
    db.commit()
    db.refresh(conversation)
    return conversation


def get_user_conversations(db: Session, user_id: int) -> List[dict]:
    """Get all conversations for a user, sorted by latest activity."""
    memberships = (
        db.query(ConversationMember)
        .filter(ConversationMember.user_id == user_id)
        .all()
    )

    conversations = []
    for membership in memberships:
        conv = db.query(Conversation).filter(Conversation.id == membership.conversation_id).first()
        if not conv:
            continue

        # Get last message
        last_message = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id, Message.deleted_at == None)
            .order_by(desc(Message.created_at))
            .first()
        )

        # Get unread count (messages not read by this user)
        unread_count = 0
        unread_messages = (
            db.query(Message)
            .filter(
                Message.conversation_id == conv.id,
                Message.sender_id != user_id,
                Message.deleted_at == None,
            )
            .all()
        )
        for msg in unread_messages:
            receipt = (
                db.query(MessageReceipt)
                .filter(
                    MessageReceipt.message_id == msg.id,
                    MessageReceipt.user_id == user_id,
                    MessageReceipt.status == "READ",
                )
                .first()
            )
            if not receipt:
                unread_count += 1

        # Get members with user details
        members = []
        for member in conv.members:
            user = db.query(User).filter(User.id == member.user_id).first()
            if user:
                members.append({
                    "user_id": user.id,
                    "username": user.username,
                    "display_name": user.display_name,
                    "avatar_url": user.avatar_url,
                    "is_online": user.is_online,
                    "role": member.role,
                })

        # Determine conversation display name for direct chats
        display_name = conv.name
        if conv.type == "DIRECT":
            other_members = [m for m in members if m["user_id"] != user_id]
            if other_members:
                other = other_members[0]
                display_name = other.get("display_name") or other.get("username")

        last_msg_data = None
        if last_message:
            sender = db.query(User).filter(User.id == last_message.sender_id).first()
            last_msg_data = {
                "id": last_message.id,
                "content": last_message.content,
                "sender_id": last_message.sender_id,
                "sender_name": sender.display_name if sender else None,
                "created_at": last_message.created_at,
                "message_type": last_message.message_type,
            }

        sort_time = last_message.created_at if last_message else conv.created_at

        conversations.append({
            "id": conv.id,
            "type": conv.type,
            "name": display_name,
            "avatar_url": conv.avatar_url,
            "created_by": conv.created_by,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "members": members,
            "last_message": last_msg_data,
            "unread_count": unread_count,
            "_sort_time": sort_time,
        })

    # Sort by latest activity
    conversations.sort(key=lambda c: c.get("_sort_time") or c["created_at"], reverse=True)
    for conv in conversations:
        conv.pop("_sort_time", None)

    return conversations


def get_conversation_by_id(db: Session, conversation_id: int, user_id: int) -> Optional[dict]:
    """Get a single conversation if user is a member."""
    membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        return None

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        return None

    members = []
    for member in conv.members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            members.append({
                "user_id": user.id,
                "username": user.username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "is_online": user.is_online,
                "role": member.role,
            })

    display_name = conv.name
    if conv.type == "DIRECT":
        other_members = [m for m in members if m["user_id"] != user_id]
        if other_members:
            other = other_members[0]
            display_name = other.get("display_name") or other.get("username")

    return {
        "id": conv.id,
        "type": conv.type,
        "name": display_name,
        "avatar_url": conv.avatar_url,
        "created_by": conv.created_by,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "members": members,
        "last_message": None,
        "unread_count": 0,
    }


def is_conversation_member(db: Session, conversation_id: int, user_id: int) -> bool:
    """Check if a user is a member of a conversation."""
    return (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
        .first()
    ) is not None
