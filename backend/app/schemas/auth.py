"""
Authentication schemas — request/response models for registration, login, and OTP verification.
"""
from pydantic import BaseModel, Field
from typing import Optional


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


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
