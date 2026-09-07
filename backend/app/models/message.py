"""
Message model — stores all messages across conversations.
Supports TEXT, IMAGE, FILE, and SYSTEM message types.
Self-referential reply_to_id enables reply-to/quoted messages.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String(10), nullable=False, default="TEXT")  # TEXT, IMAGE, FILE, SYSTEM
    reply_to_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    edited_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="messages_sent")
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")
    reply_to = relationship("Message", remote_side=[id], uselist=False)

    def __repr__(self):
        return f"<Message(id={self.id}, conversation_id={self.conversation_id}, type='{self.message_type}')>"
