"""
Conversation model — represents both DIRECT and GROUP conversations.
Uses a single table for both types, distinguished by the 'type' field.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(10), nullable=False, default="DIRECT")  # DIRECT or GROUP
    name = Column(String(200), nullable=True)  # Group name; null for direct chats
    avatar_url = Column(String(500), nullable=True)
    invite_code = Column(String(64), unique=True, index=True, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<Conversation(id={self.id}, type='{self.type}', name='{self.name}')>"
