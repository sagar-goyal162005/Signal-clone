"""
Authentication router — register, verify OTP, login, logout, current user.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, RegisterResponse, VerifyOTPRequest, LoginRequest,
    TokenResponse, MessageResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import (
    register_user, verify_otp, login_user, create_access_token,
)

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user. Returns a mock OTP message and code."""
    try:
        user = register_user(db, request.username, request.password, request.phone)
        return RegisterResponse(
            message="Registration successful. Your verification code has been sent. (Dev OTP: 123456)",
            otp_code=user.otp_code or "123456",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/verify", response_model=TokenResponse)
def verify(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify OTP and return access token."""
    try:
        user = verify_otp(db, request.username, request.resolved_otp)
        token = create_access_token(user.id, user.username)
        return TokenResponse(
            access_token=token,
            user_id=user.id,
            username=user.username,
            display_name=user.display_name,
            is_verified=True,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with username and password."""
    try:
        user = login_user(db, request.username, request.password)
        token = create_access_token(user.id, user.username)
        return TokenResponse(
            access_token=token,
            user_id=user.id,
            username=user.username,
            display_name=user.display_name,
            is_verified=user.is_verified,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """Logout current user (client-side token removal)."""
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return UserResponse.model_validate(current_user)
