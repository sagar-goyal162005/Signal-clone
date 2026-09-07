"""
Message service — handles message CRUD with receipt tracking and encryption.
"""
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.message import Message
from app.models.message_receipt import MessageReceipt
from app.models.conversation_member import ConversationMember
from app.models.user import User
from app.services.encryption_service import encrypt_message, decrypt_message


def create_message(
    db: Session,
    conversation_id: int,
    sender_id: int,
    content: str,
    message_type: str = "TEXT",
    reply_to_id: Optional[int] = None,
) -> dict:
    """Create a new message, encrypt content, and create SENT receipt."""
    # Encrypt message content
    encrypted_content = encrypt_message(content)

    message = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=encrypted_content,
        message_type=message_type,
        reply_to_id=reply_to_id,
    )
    db.add(message)
    db.flush()

    # Create SENT receipt for the sender
    receipt = MessageReceipt(
        message_id=message.id,
        user_id=sender_id,
        status="SENT",
    )
    db.add(receipt)
    db.commit()
    db.refresh(message)

    return _message_to_dict(db, message)


def get_conversation_messages(
    db: Session,
    conversation_id: int,
    limit: int = 50,
    before_id: Optional[int] = None,
) -> Tuple[List[dict], bool, int]:
    """Get messages for a conversation with pagination. Returns (messages, has_more, total)."""
    query = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.deleted_at == None,
    )

    total = query.count()

    if before_id:
        query = query.filter(Message.id < before_id)

    messages = query.order_by(desc(Message.created_at)).limit(limit + 1).all()

    has_more = len(messages) > limit
    if has_more:
        messages = messages[:limit]

    # Reverse to get chronological order
    messages.reverse()

    return [_message_to_dict(db, msg) for msg in messages], has_more, total


def update_message(db: Session, message_id: int, sender_id: int, content: str) -> dict:
    """Edit a message. Only the sender can edit their own messages."""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise ValueError("Message not found")
    if message.sender_id != sender_id:
        raise ValueError("You can only edit your own messages")

    message.content = encrypt_message(content)
    message.edited_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)
    return _message_to_dict(db, message)


def delete_message(db: Session, message_id: int, sender_id: int) -> bool:
    """Soft delete a message. Only the sender can delete their own messages."""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise ValueError("Message not found")
    if message.sender_id != sender_id:
        raise ValueError("You can only delete your own messages")

    message.deleted_at = datetime.now(timezone.utc)
    message.content = ""
    db.commit()
    return True


def mark_messages_delivered(db: Session, conversation_id: int, user_id: int) -> List[int]:
    """Mark all undelivered messages in a conversation as DELIVERED for a user.
    Returns list of affected message IDs."""
    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.deleted_at == None,
        )
        .all()
    )

    affected_ids = []
    for message in messages:
        existing = (
            db.query(MessageReceipt)
            .filter(MessageReceipt.message_id == message.id, MessageReceipt.user_id == user_id)
            .first()
        )
        if not existing:
            receipt = MessageReceipt(
                message_id=message.id,
                user_id=user_id,
                status="DELIVERED",
            )
            db.add(receipt)
            affected_ids.append(message.id)
        elif existing.status == "SENT":
            existing.status = "DELIVERED"
            existing.timestamp = datetime.now(timezone.utc)
            affected_ids.append(message.id)

    if affected_ids:
        db.commit()
    return affected_ids


def mark_messages_read(db: Session, conversation_id: int, user_id: int) -> List[int]:
    """Mark all messages in a conversation as READ for a user.
    Returns list of affected message IDs."""
    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.deleted_at == None,
        )
        .all()
    )

    affected_ids = []
    for message in messages:
        existing = (
            db.query(MessageReceipt)
            .filter(MessageReceipt.message_id == message.id, MessageReceipt.user_id == user_id)
            .first()
        )
        if not existing:
            receipt = MessageReceipt(
                message_id=message.id,
                user_id=user_id,
                status="READ",
            )
            db.add(receipt)
            affected_ids.append(message.id)
        elif existing.status != "READ":
            existing.status = "READ"
            existing.timestamp = datetime.now(timezone.utc)
            affected_ids.append(message.id)

    if affected_ids:
        db.commit()
    return affected_ids


def get_message_status(db: Session, message: Message) -> str:
    """Compute the aggregate status of a message based on all receipts.
    Returns the lowest status across all recipients."""
    receipts = db.query(MessageReceipt).filter(MessageReceipt.message_id == message.id).all()

    if not receipts:
        return "SENT"

    # Get members of the conversation excluding sender
    members = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == message.conversation_id,
            ConversationMember.user_id != message.sender_id,
        )
        .all()
    )

    if not members:
        return "SENT"

    member_ids = {m.user_id for m in members}
    receipt_map = {r.user_id: r.status for r in receipts if r.user_id in member_ids}

    if not receipt_map:
        return "SENT"

    # All members must have READ for message to be READ
    statuses = [receipt_map.get(mid, "SENT") for mid in member_ids]

    if all(s == "READ" for s in statuses):
        return "READ"
    elif all(s in ("DELIVERED", "READ") for s in statuses):
        return "DELIVERED"
    return "SENT"


def _message_to_dict(db: Session, message: Message) -> dict:
    """Convert a message to a response dictionary with decrypted content."""
    sender = db.query(User).filter(User.id == message.sender_id).first()

    # Decrypt content for response
    decrypted_content = decrypt_message(message.content) if message.content else ""

    receipts = db.query(MessageReceipt).filter(MessageReceipt.message_id == message.id).all()
    status = get_message_status(db, message)

    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "sender": {
            "id": sender.id,
            "username": sender.username,
            "display_name": sender.display_name,
            "avatar_url": sender.avatar_url,
        } if sender else None,
        "content": decrypted_content,
        "message_type": message.message_type,
        "reply_to_id": message.reply_to_id,
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "edited_at": message.edited_at.isoformat() if message.edited_at else None,
        "deleted_at": message.deleted_at.isoformat() if message.deleted_at else None,
        "receipts": [
            {
                "user_id": r.user_id,
                "status": r.status,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            }
            for r in receipts
        ],
        "status": status,
    }
