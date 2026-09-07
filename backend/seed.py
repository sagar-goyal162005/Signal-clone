"""
Database seed script for Cipher Messenger.
Creates test users, contacts, direct conversations, group chats, and mock message histories.
"""
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta, timezone
from app.database import SessionLocal, create_tables
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.conversation_member import ConversationMember
from app.models.message import Message
from app.models.message_receipt import MessageReceipt
from app.services.auth_service import hash_password
from app.services.encryption_service import encrypt_message


def seed():
    print("Creating tables...")
    create_tables()

    db = SessionLocal()
    try:
        # Check if users already exist
        if db.query(User).count() > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding users...")
        now = datetime.now(timezone.utc)

        users_data = [
            {
                "username": "alex",
                "phone": "+12025550101",
                "display_name": "Alex Rivers",
                "about": "Privacy is a fundamental right. Always encrypted.",
                "avatar_url": None,
                "password": "Password123!",
                "is_online": True,
            },
            {
                "username": "sarah",
                "phone": "+12025550102",
                "display_name": "Sarah Connor",
                "about": "No fate but what we make.",
                "avatar_url": None,
                "password": "Password123!",
                "is_online": True,
            },
            {
                "username": "john",
                "phone": "+12025550103",
                "display_name": "John Doe",
                "about": "Hey there! I am using Cipher.",
                "avatar_url": None,
                "password": "Password123!",
                "is_online": False,
            },
            {
                "username": "mike",
                "phone": "+12025550104",
                "display_name": "Mike Ross",
                "about": "Sometimes good guys gotta do bad things to make the bad guys pay.",
                "avatar_url": None,
                "password": "Password123!",
                "is_online": False,
            },
            {
                "username": "david",
                "phone": "+12025550105",
                "display_name": "David Clark",
                "about": "Building secure systems.",
                "avatar_url": None,
                "password": "Password123!",
                "is_online": True,
            },
            {
                "username": "emma",
                "phone": "+12025550106",
                "display_name": "Emma Watson",
                "about": "Available for secure calls.",
                "avatar_url": None,
                "password": "Password123!",
                "is_online": False,
            },
        ]

        users = []
        for u in users_data:
            user = User(
                username=u["username"],
                phone=u["phone"],
                display_name=u["display_name"],
                about=u["about"],
                avatar_url=u["avatar_url"],
                password_hash=hash_password(u["password"]),
                is_online=u["is_online"],
                is_verified=True,
                last_seen=now - timedelta(minutes=15) if not u["is_online"] else now,
            )
            db.add(user)
            users.append(user)

        db.commit()
        for u in users:
            db.refresh(u)

        alex, sarah, john, mike, david, emma = users

        print("Seeding contacts for Alex Rivers...")
        contacts = [
            Contact(owner_id=alex.id, contact_user_id=sarah.id),
            Contact(owner_id=alex.id, contact_user_id=john.id),
            Contact(owner_id=alex.id, contact_user_id=mike.id),
            Contact(owner_id=alex.id, contact_user_id=david.id),
            Contact(owner_id=alex.id, contact_user_id=emma.id),
            # reciprocal contacts
            Contact(owner_id=sarah.id, contact_user_id=alex.id),
            Contact(owner_id=john.id, contact_user_id=alex.id),
            Contact(owner_id=mike.id, contact_user_id=alex.id),
        ]
        db.add_all(contacts)
        db.commit()

        print("Seeding conversations...")
        # 1. Direct: Alex & Sarah
        conv_alex_sarah = Conversation(type="DIRECT", created_by=alex.id)
        db.add(conv_alex_sarah)
        db.flush()
        db.add_all([
            ConversationMember(conversation_id=conv_alex_sarah.id, user_id=alex.id, role="MEMBER"),
            ConversationMember(conversation_id=conv_alex_sarah.id, user_id=sarah.id, role="MEMBER"),
        ])

        # 2. Direct: Alex & John
        conv_alex_john = Conversation(type="DIRECT", created_by=alex.id)
        db.add(conv_alex_john)
        db.flush()
        db.add_all([
            ConversationMember(conversation_id=conv_alex_john.id, user_id=alex.id, role="MEMBER"),
            ConversationMember(conversation_id=conv_alex_john.id, user_id=john.id, role="MEMBER"),
        ])

        # 3. Direct: Alex & David
        conv_alex_david = Conversation(type="DIRECT", created_by=david.id)
        db.add(conv_alex_david)
        db.flush()
        db.add_all([
            ConversationMember(conversation_id=conv_alex_david.id, user_id=alex.id, role="MEMBER"),
            ConversationMember(conversation_id=conv_alex_david.id, user_id=david.id, role="MEMBER"),
        ])

        # 4. Group: Security Architecture
        conv_group = Conversation(
            type="GROUP",
            name="Security Architecture Team",
            created_by=alex.id,
        )
        db.add(conv_group)
        db.flush()
        db.add_all([
            ConversationMember(conversation_id=conv_group.id, user_id=alex.id, role="ADMIN"),
            ConversationMember(conversation_id=conv_group.id, user_id=sarah.id, role="MEMBER"),
            ConversationMember(conversation_id=conv_group.id, user_id=david.id, role="MEMBER"),
            ConversationMember(conversation_id=conv_group.id, user_id=mike.id, role="MEMBER"),
        ])

        db.commit()

        print("Seeding messages...")
        # Messages for Alex & Sarah
        sarah_msgs = [
            (sarah.id, "Hey Alex, did you review the security architecture specification?", 60),
            (alex.id, "Yes, looks solid! The end-to-end ratchet protocol flow is clear.", 50),
            (sarah.id, "Awesome. What about the forward secrecy key rotation intervals?", 35),
            (alex.id, "15-minute rotation for active sessions with pre-keys uploaded to the server.", 20),
            (sarah.id, "Perfect. Let's demo the encrypted messaging interface today!", 5),
        ]

        for sender_id, text, mins_ago in sarah_msgs:
            t = now - timedelta(minutes=mins_ago)
            msg = Message(
                conversation_id=conv_alex_sarah.id,
                sender_id=sender_id,
                content=encrypt_message(text),
                message_type="TEXT",
                created_at=t,
            )
            db.add(msg)
            db.flush()
            # Add read receipts
            for u in [alex, sarah]:
                db.add(MessageReceipt(message_id=msg.id, user_id=u.id, status="READ", timestamp=t))

        # Messages for Alex & John
        john_msgs = [
            (john.id, "Hey Alex! Are we still syncing up on the frontend styling today?", 180),
            (alex.id, "Hey John! Yes, at 3 PM. We'll verify the Signal Blue theme tokens and micro-interactions.", 120),
            (john.id, "Sounds great, see you then!", 110),
        ]
        for sender_id, text, mins_ago in john_msgs:
            t = now - timedelta(minutes=mins_ago)
            msg = Message(
                conversation_id=conv_alex_john.id,
                sender_id=sender_id,
                content=encrypt_message(text),
                message_type="TEXT",
                created_at=t,
            )
            db.add(msg)
            db.flush()
            for u in [alex, john]:
                db.add(MessageReceipt(message_id=msg.id, user_id=u.id, status="READ", timestamp=t))

        # Messages for Alex & David (David sent a recent unread message)
        david_msgs = [
            (alex.id, "David, can you double check the WebSocket reconnection backoff?", 90),
            (david.id, "Already tuned it with exponential jitter up to 10 seconds. All test suites passing!", 45),
        ]
        for sender_id, text, mins_ago in david_msgs:
            t = now - timedelta(minutes=mins_ago)
            msg = Message(
                conversation_id=conv_alex_david.id,
                sender_id=sender_id,
                content=encrypt_message(text),
                message_type="TEXT",
                created_at=t,
            )
            db.add(msg)
            db.flush()
            db.add(MessageReceipt(message_id=msg.id, user_id=sender_id, status="SENT", timestamp=t))
            recipient_id = alex.id if sender_id == david.id else david.id
            # David's reply is DELIVERED but unread by Alex
            status = "DELIVERED" if sender_id == david.id else "READ"
            db.add(MessageReceipt(message_id=msg.id, user_id=recipient_id, status=status, timestamp=t))

        # Messages for Group
        group_msgs = [
            (alex.id, "SYSTEM", "Group \"Security Architecture Team\" created", 300),
            (alex.id, "TEXT", "Welcome team! This channel is for our secure platform design and protocol implementation.", 280),
            (mike.id, "TEXT", "Glad to be here. I'm verifying the contact search and group admin authorization rules.", 240),
            (sarah.id, "TEXT", "I have verified the mock encryption service and receipt statuses.", 200),
            (david.id, "TEXT", "WebSockets are fully bidirectional now with typing indicators and online presence updates.", 150),
            (alex.id, "TEXT", "Outstanding work everyone. Let's ship the client!", 30),
        ]
        for sender_id, m_type, text, mins_ago in group_msgs:
            t = now - timedelta(minutes=mins_ago)
            msg = Message(
                conversation_id=conv_group.id,
                sender_id=sender_id,
                content=text if m_type == "SYSTEM" else encrypt_message(text),
                message_type=m_type,
                created_at=t,
            )
            db.add(msg)
            db.flush()
            for member in [alex, sarah, david, mike]:
                db.add(MessageReceipt(message_id=msg.id, user_id=member.id, status="READ", timestamp=t))

        db.commit()
        print("Seed completed successfully! 6 users, 4 conversations, contacts and messages ready.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
