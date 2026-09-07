"""
Models package — import all models so SQLAlchemy creates tables automatically.
"""
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.conversation_member import ConversationMember
from app.models.message import Message
from app.models.message_receipt import MessageReceipt
from app.models.user_settings import UserSettings
