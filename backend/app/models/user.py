"""
User model — stores registered user profiles, online status, and credentials.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True)
    display_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    about = Column(String(255), nullable=True, default="Hey there! I am using Cipher.")
    password_hash = Column(String(255), nullable=False)
    is_online = Column(Boolean, default=False, nullable=False)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # OTP fields for mock verification
    otp_code = Column(String(10), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Relationships
    contacts_owned = relationship("Contact", foreign_keys="Contact.owner_id", back_populates="owner", cascade="all, delete-orphan")
    contacts_as_target = relationship("Contact", foreign_keys="Contact.contact_user_id", back_populates="contact_user")
    conversation_memberships = relationship("ConversationMember", back_populates="user", cascade="all, delete-orphan")
    messages_sent = relationship("Message", back_populates="sender", cascade="all, delete-orphan")
    receipts = relationship("MessageReceipt", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"
