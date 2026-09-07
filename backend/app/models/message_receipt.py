"""
MessageReceipt model — tracks delivery status per message per recipient.
Status progression: SENT → DELIVERED → READ
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class MessageReceipt(Base):
    __tablename__ = "message_receipts"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(10), nullable=False, default="SENT")  # SENT, DELIVERED, READ
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)

    # One receipt per message per user
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_user_receipt"),
    )

    # Relationships
    message = relationship("Message", back_populates="receipts")
    user = relationship("User", back_populates="receipts")

    def __repr__(self):
        return f"<MessageReceipt(message_id={self.message_id}, user_id={self.user_id}, status='{self.status}')>"
