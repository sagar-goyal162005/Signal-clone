"""
Authentication service — handles registration, OTP verification, login, and JWT tokens.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
# Passlib compatibility shim for bcrypt >= 4.1.0
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("about", (), {"__version__": getattr(bcrypt, "__version__", "4.0.0")})

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int, username: str) -> str:
    """Create a JWT access token for the given user."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    to_encode = {
        "sub": str(user_id),
        "username": username,
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def register_user(db: Session, username: str, password: str, phone: Optional[str] = None) -> User:
    """Register a new user with a mock OTP code."""
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise ValueError("Username already taken")

    if phone:
        existing_phone = db.query(User).filter(User.phone == phone).first()
        if existing_phone:
            raise ValueError("Phone number already registered")

    user = User(
        username=username,
        password_hash=hash_password(password),
        phone=phone,
        otp_code=settings.MOCK_OTP,
        is_verified=False,
        display_name=username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def verify_otp(db: Session, username: str, otp: str) -> User:
    """Verify user's OTP code. Uses a fixed mock OTP for development."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise ValueError("User not found")

    if user.is_verified:
        raise ValueError("User already verified")

    if otp != settings.MOCK_OTP:
        raise ValueError("Invalid OTP code")

    user.is_verified = True
    user.otp_code = None
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, username: str, password: str) -> User:
    """Authenticate user credentials and return the user."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise ValueError("Invalid username or password")

    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid username or password")

    if not user.is_verified:
        raise ValueError("Account not verified. Please verify your OTP first.")

    return user
