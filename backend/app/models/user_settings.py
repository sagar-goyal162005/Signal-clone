"""
UserSettings model — stores per-user privacy, security, and notification preferences.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Messaging Privacy
    read_receipts = Column(Boolean, default=True, nullable=False)
    typing_indicators = Column(Boolean, default=True, nullable=False)
    link_previews = Column(Boolean, default=False, nullable=False)

    # Security & Encryption
    screen_security = Column(Boolean, default=True, nullable=False)
    incognito_keyboard = Column(Boolean, default=True, nullable=False)
    registration_lock = Column(Boolean, default=True, nullable=False)

    # Disappearing Messages
    disappearing_messages_timer = Column(String(20), default="off", nullable=False)  # "off", "30s", "5m", "1h", "8h", "1d", "1w"

    # Notifications
    notifications_enabled = Column(Boolean, default=True, nullable=False)
    notification_sound = Column(Boolean, default=True, nullable=False)
    notification_previews = Column(Boolean, default=True, nullable=False)

    # Relationship
    user = relationship("User", backref="settings_record")

    def __repr__(self):
        return f"<UserSettings(user_id={self.user_id})>"
