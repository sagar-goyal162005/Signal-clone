"""
WebSocket connection manager and endpoint routing.
Tracks active connections and delivers real-time events to users and conversations.
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.config import settings
from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.conversation_member import ConversationMember
from app.websocket.events import handle_websocket_event

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections for users."""

    def __init__(self):
        # Maps user_id -> list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept connection and register websocket for user."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected. Active connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Unregister websocket connection."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected.")

    def is_user_online(self, user_id: int) -> bool:
        """Check if user currently has at least one active connection."""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    async def send_personal_message(self, data: dict, user_id: int):
        """Send a message directly to all active connections of a specific user."""
        if user_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(dead, user_id)

    async def broadcast_to_conversation(
        self,
        db: Session,
        conversation_id: int,
        data: dict,
        exclude_user_id: Optional[int] = None,
    ):
        """Broadcast an event to all connected members of a conversation."""
        members = (
            db.query(ConversationMember)
            .filter(ConversationMember.conversation_id == conversation_id)
            .all()
        )
        for member in members:
            if exclude_user_id and member.user_id == exclude_user_id:
                continue
            await self.send_personal_message(data, member.user_id)

    async def broadcast_presence(self, db: Session, user_id: int, is_online: bool):
        """Notify all conversation partners of a user's presence change."""
        # Find all conversations the user is in
        memberships = (
            db.query(ConversationMember)
            .filter(ConversationMember.user_id == user_id)
            .all()
        )
        conversation_ids = [m.conversation_id for m in memberships]
        if not conversation_ids:
            return

        # Find all other members in those conversations
        partner_members = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id.in_(conversation_ids),
                ConversationMember.user_id != user_id,
            )
            .all()
        )
        notified_users = set()
        for partner in partner_members:
            if partner.user_id not in notified_users:
                notified_users.add(partner.user_id)
                await self.send_personal_message(
                    {
                        "type": "user_presence",
                        "user_id": user_id,
                        "is_online": is_online,
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                    },
                    partner.user_id,
                )


manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time messaging, typing, and status updates.
    Optionally authenticates with JWT token via query param.
    """
    db = SessionLocal()
    try:
        # Validate token if provided
        if token:
            try:
                payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
                token_user_id = payload.get("sub")
                if token_user_id is not None and int(token_user_id) != user_id:
                    await websocket.close(code=4003)
                    return
            except JWTError:
                await websocket.close(code=4001)
                return

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4004)
            return

        await manager.connect(websocket, user_id)

        # Update user status to online
        user.is_online = True
        db.commit()
        await manager.broadcast_presence(db, user_id, is_online=True)

        while True:
            data = await websocket.receive_json()
            await handle_websocket_event(manager, websocket, user_id, data, db)

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        # If user has no more active connections, set offline
        if not manager.is_user_online(user_id):
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_online = False
                user.last_seen = datetime.now(timezone.utc)
                db.commit()
            await manager.broadcast_presence(db, user_id, is_online=False)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)
    finally:
        db.close()
