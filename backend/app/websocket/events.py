"""
WebSocket event handlers for real-time messaging, typing indicators, receipts, and presence.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.services.message_service import (
    create_message,
    mark_messages_delivered,
    mark_messages_read,
)
from app.services.conversation_service import is_conversation_member
from app.models.user import User

logger = logging.getLogger(__name__)


async def handle_websocket_event(
    manager,
    websocket: WebSocket,
    user_id: int,
    data: Dict[str, Any],
    db: Session,
):
    """Dispatch and process incoming WebSocket events from a client."""
    event_type = data.get("type")
    if not event_type:
        await websocket.send_json({"type": "error", "detail": "Missing event type"})
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.send_json({"type": "error", "detail": "User not found"})
        return

    # Heartbeat ping/pong
    if event_type == "ping":
        await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})
        return

    # Send new message via WebSocket
    elif event_type == "message":
        conversation_id = data.get("conversation_id")
        content = data.get("content")
        message_type = data.get("message_type", "TEXT")
        reply_to_id = data.get("reply_to_id")

        if not conversation_id or content is None:
            await websocket.send_json({"type": "error", "detail": "conversation_id and content are required"})
            return

        if not is_conversation_member(db, conversation_id, user_id):
            await websocket.send_json({"type": "error", "detail": "You are not a member of this conversation"})
            return

        message_dict = create_message(
            db=db,
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            message_type=message_type,
            reply_to_id=reply_to_id,
        )

        # Broadcast to all conversation members (including sender)
        await manager.broadcast_to_conversation(
            db=db,
            conversation_id=conversation_id,
            data={
                "type": "message",
                "conversation_id": conversation_id,
                "message": message_dict,
            },
        )

    # Typing start indicator
    elif event_type == "typing_start":
        conversation_id = data.get("conversation_id")
        if conversation_id and is_conversation_member(db, conversation_id, user_id):
            await manager.broadcast_to_conversation(
                db=db,
                conversation_id=conversation_id,
                data={
                    "type": "typing_start",
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "username": user.username,
                    "display_name": user.display_name,
                },
                exclude_user_id=user_id,
            )

    # Typing stop indicator
    elif event_type == "typing_stop":
        conversation_id = data.get("conversation_id")
        if conversation_id and is_conversation_member(db, conversation_id, user_id):
            await manager.broadcast_to_conversation(
                db=db,
                conversation_id=conversation_id,
                data={
                    "type": "typing_stop",
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                },
                exclude_user_id=user_id,
            )

    # Mark conversation messages as read
    elif event_type == "message_read":
        conversation_id = data.get("conversation_id")
        if conversation_id and is_conversation_member(db, conversation_id, user_id):
            affected_ids = mark_messages_read(db, conversation_id, user_id)
            if affected_ids:
                await manager.broadcast_to_conversation(
                    db=db,
                    conversation_id=conversation_id,
                    data={
                        "type": "message_read",
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "message_ids": affected_ids,
                        "read_at": datetime.now(timezone.utc).isoformat(),
                    },
                )

    # Mark conversation messages as delivered
    elif event_type == "message_delivered":
        conversation_id = data.get("conversation_id")
        if conversation_id and is_conversation_member(db, conversation_id, user_id):
            affected_ids = mark_messages_delivered(db, conversation_id, user_id)
            if affected_ids:
                await manager.broadcast_to_conversation(
                    db=db,
                    conversation_id=conversation_id,
                    data={
                        "type": "message_delivered",
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "message_ids": affected_ids,
                    },
                )
    else:
        logger.warning("Unknown WebSocket event: %s", event_type)
