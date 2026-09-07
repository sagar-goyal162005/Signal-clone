"""
Authentication schemas — request/response models for registration, login, and OTP verification.
"""
import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4, max_length=8)
    phone: Optional[str] = Field(None, max_length=20)

    @field_validator("password")
    @classmethod
    def validate_strong_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;\'/~`]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class RegisterResponse(BaseModel):
    message: str
    otp_code: Optional[str] = None


class VerifyOTPRequest(BaseModel):
    username: str
    otp: Optional[str] = None
    otp_code: Optional[str] = None

    @property
    def resolved_otp(self) -> str:
        return self.otp or self.otp_code or ""


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    display_name: Optional[str] = None
    is_verified: bool = False


class MessageResponse(BaseModel):
    message: str
