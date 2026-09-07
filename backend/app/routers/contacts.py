"""
Contacts router — contact list management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactResponse
from app.schemas.auth import MessageResponse
from app.services.contact_service import get_contacts, add_contact, remove_contact

router = APIRouter()


@router.get("", response_model=List[ContactResponse])
def list_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all contacts for the current user."""
    contacts = get_contacts(db, current_user.id)
    return contacts


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    request: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new contact."""
    try:
        contact = add_contact(db, current_user.id, request.contact_user_id)
        # Return full contact response
        contacts = get_contacts(db, current_user.id)
        for c in contacts:
            if c["id"] == contact.id:
                return c
        raise HTTPException(status_code=500, detail="Failed to retrieve contact")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{contact_id}", response_model=MessageResponse)
def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a contact."""
    try:
        remove_contact(db, current_user.id, contact_id)
        return MessageResponse(message="Contact removed")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
