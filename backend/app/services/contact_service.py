"""
Contact service — manages user contact relationships.
"""
from typing import List
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.user import User


def get_contacts(db: Session, user_id: int) -> List[dict]:
    """Get all contacts for a user with contact user details."""
    contacts = (
        db.query(Contact, User)
        .join(User, Contact.contact_user_id == User.id)
        .filter(Contact.owner_id == user_id)
        .order_by(User.display_name, User.username)
        .all()
    )

    result = []
    for contact, user in contacts:
        result.append({
            "id": contact.id,
            "owner_id": contact.owner_id,
            "contact_user_id": contact.contact_user_id,
            "contact_username": user.username,
            "contact_display_name": user.display_name,
            "contact_avatar_url": user.avatar_url,
            "contact_is_online": user.is_online,
            "contact_last_seen": user.last_seen,
            "created_at": contact.created_at,
        })
    return result


def add_contact(db: Session, owner_id: int, contact_user_id: int) -> Contact:
    """Add a new contact, preventing self-add and duplicates."""
    if owner_id == contact_user_id:
        raise ValueError("Cannot add yourself as a contact")

    # Check if contact user exists
    contact_user = db.query(User).filter(User.id == contact_user_id).first()
    if not contact_user:
        raise ValueError("User not found")

    # Check for existing contact
    existing = (
        db.query(Contact)
        .filter(Contact.owner_id == owner_id, Contact.contact_user_id == contact_user_id)
        .first()
    )
    if existing:
        raise ValueError("Contact already added")

    contact = Contact(owner_id=owner_id, contact_user_id=contact_user_id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def remove_contact(db: Session, owner_id: int, contact_id: int) -> bool:
    """Remove a contact by its ID, ensuring ownership."""
    contact = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.owner_id == owner_id)
        .first()
    )
    if not contact:
        raise ValueError("Contact not found")

    db.delete(contact)
    db.commit()
    return True
