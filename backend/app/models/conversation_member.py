"""
ConversationMember model — many-to-many join between users and conversations.
Tracks membership role (MEMBER or ADMIN) for group permission enforcement.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(10), nullable=False, default="MEMBER")  # MEMBER or ADMIN
    joined_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Prevent duplicate memberships
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_user"),
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User", back_populates="conversation_memberships")

    def __repr__(self):
        return f"<ConversationMember(conversation_id={self.conversation_id}, user_id={self.user_id}, role='{self.role}')>"
