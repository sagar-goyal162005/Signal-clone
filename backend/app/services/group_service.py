"""
Group service — manages group conversations, members, and admin controls.
"""
import secrets
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.conversation_member import ConversationMember
from app.models.message import Message
from app.models.user import User


def get_group_details(db: Session, group_id: int, user_id: int) -> Optional[dict]:
    """Get group details with member list. Returns None if user isn't a member."""
    membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == group_id,
            ConversationMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        return None

    conv = db.query(Conversation).filter(
        Conversation.id == group_id, Conversation.type == "GROUP"
    ).first()
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
                "joined_at": member.joined_at.isoformat() if member.joined_at else None,
            })

    return {
        "id": conv.id,
        "name": conv.name,
        "avatar_url": conv.avatar_url,
        "invite_code": conv.invite_code,
        "created_by": conv.created_by,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "members": members,
        "member_count": len(members),
    }


def add_group_member(
    db: Session,
    group_id: int,
    admin_id: int,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
) -> tuple:
    """Add a member to a group. Only admins can add members. Returns (member_dict, system_msg)."""
    # Verify admin status
    admin_membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == group_id,
            ConversationMember.user_id == admin_id,
            ConversationMember.role == "ADMIN",
        )
        .first()
    )
    if not admin_membership:
        raise ValueError("Only admins can add members")

    # Verify the group exists
    conv = db.query(Conversation).filter(
        Conversation.id == group_id, Conversation.type == "GROUP"
    ).first()
    if not conv:
        raise ValueError("Group not found")

    # Verify the target user exists
    target_user = None
    if user_id:
        target_user = db.query(User).filter(User.id == user_id).first()
    elif username:
        target_user = db.query(User).filter(User.username.ilike(username.strip())).first()
    else:
        raise ValueError("User ID or username is required")

    if not target_user:
        raise ValueError("User not found")

    # Check if already a member
    existing = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == group_id,
            ConversationMember.user_id == target_user.id,
        )
        .first()
    )
    if existing:
        raise ValueError("User is already a member")

    member = ConversationMember(
        conversation_id=group_id, user_id=target_user.id, role="MEMBER"
    )
    db.add(member)

    # Add system message
    admin_user = db.query(User).filter(User.id == admin_id).first()
    system_msg = Message(
        conversation_id=group_id,
        sender_id=admin_id,
        content=f"{admin_user.display_name or admin_user.username} added {target_user.display_name or target_user.username}",
        message_type="SYSTEM",
    )
    db.add(system_msg)
    db.commit()
    db.refresh(system_msg)

    member_dict = {
        "user_id": target_user.id,
        "username": target_user.username,
        "display_name": target_user.display_name,
        "avatar_url": target_user.avatar_url,
        "is_online": target_user.is_online,
        "role": "MEMBER",
    }
    return member_dict, system_msg


def remove_group_member(db: Session, group_id: int, admin_id: int, user_id: int) -> tuple:
    """Remove a member from a group. Only admins can remove members.
    Members can also remove themselves (leave group). Returns (success, system_msg)."""
    is_self_leave = admin_id == user_id

    if not is_self_leave:
        # Verify admin status
        admin_membership = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == group_id,
                ConversationMember.user_id == admin_id,
                ConversationMember.role == "ADMIN",
            )
            .first()
        )
        if not admin_membership:
            raise ValueError("Only admins can remove members")

    # Find the membership to remove
    membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == group_id,
            ConversationMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise ValueError("User is not a member of this group")

    # Get names for system message
    admin_user = db.query(User).filter(User.id == admin_id).first()
    target_user = db.query(User).filter(User.id == user_id).first()

    db.delete(membership)

    # Add system message
    if is_self_leave:
        content = f"{target_user.display_name or target_user.username} left the group"
    else:
        content = f"{admin_user.display_name or admin_user.username} removed {target_user.display_name or target_user.username}"

    system_msg = Message(
        conversation_id=group_id,
        sender_id=admin_id,
        content=content,
        message_type="SYSTEM",
    )
    db.add(system_msg)
    db.commit()
    db.refresh(system_msg)
    return True, system_msg


def get_or_create_invite_code(db: Session, group_id: int, user_id: int) -> str:
    """Get existing invite code or generate a new one for a group."""
    membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == group_id,
            ConversationMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise ValueError("You are not a member of this group")

    conv = db.query(Conversation).filter(
        Conversation.id == group_id, Conversation.type == "GROUP"
    ).first()
    if not conv:
        raise ValueError("Group not found")

    if not conv.invite_code:
        conv.invite_code = secrets.token_urlsafe(16)
        db.commit()
        db.refresh(conv)

    return conv.invite_code


def reset_invite_code(db: Session, group_id: int, admin_id: int) -> str:
    """Reset the invite code for a group. Admin only."""
    admin_membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == group_id,
            ConversationMember.user_id == admin_id,
            ConversationMember.role == "ADMIN",
        )
        .first()
    )
    if not admin_membership:
        raise ValueError("Only admins can reset invite links")

    conv = db.query(Conversation).filter(
        Conversation.id == group_id, Conversation.type == "GROUP"
    ).first()
    if not conv:
        raise ValueError("Group not found")

    conv.invite_code = secrets.token_urlsafe(16)
    db.commit()
    db.refresh(conv)
    return conv.invite_code


def get_group_preview_by_invite(db: Session, invite_code: str) -> dict:
    """Get public group information for preview before joining."""
    conv = db.query(Conversation).filter(
        Conversation.invite_code == invite_code, Conversation.type == "GROUP"
    ).first()
    if not conv:
        raise ValueError("Invalid or expired invite link")

    return {
        "id": conv.id,
        "name": conv.name,
        "avatar_url": conv.avatar_url,
        "member_count": len(conv.members),
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
    }


def join_group_by_invite(db: Session, invite_code: str, user_id: int) -> tuple:
    """Join a group using an invite code. Returns (conv, system_msg, is_new)."""
    conv = db.query(Conversation).filter(
        Conversation.invite_code == invite_code, Conversation.type == "GROUP"
    ).first()
    if not conv:
        raise ValueError("Invalid or expired invite link")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")

    existing = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conv.id,
            ConversationMember.user_id == user_id,
        )
        .first()
    )
    if existing:
        return conv, None, False

    member = ConversationMember(
        conversation_id=conv.id, user_id=user_id, role="MEMBER"
    )
    db.add(member)

    system_msg = Message(
        conversation_id=conv.id,
        sender_id=user_id,
        content=f"{user.display_name or user.username} joined via invite link",
        message_type="SYSTEM",
    )
    db.add(system_msg)
    db.commit()
    db.refresh(conv)
    db.refresh(system_msg)

    return conv, system_msg, True


def update_group(db: Session, group_id: int, admin_id: int, name: Optional[str] = None, avatar_url: Optional[str] = None) -> dict:
    """Update group details. Only admins can update."""
    admin_membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == group_id,
            ConversationMember.user_id == admin_id,
            ConversationMember.role == "ADMIN",
        )
        .first()
    )
    if not admin_membership:
        raise ValueError("Only admins can update group details")

    conv = db.query(Conversation).filter(
        Conversation.id == group_id, Conversation.type == "GROUP"
    ).first()
    if not conv:
        raise ValueError("Group not found")

    if name is not None:
        conv.name = name
    if avatar_url is not None:
        conv.avatar_url = avatar_url

    db.commit()
    db.refresh(conv)
    return get_group_details(db, group_id, admin_id)
