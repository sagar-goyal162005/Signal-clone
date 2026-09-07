"""
Cipher Messenger — FastAPI Backend Entry Point

A secure messaging platform API providing:
- User authentication with mock OTP
- Contact management
- Real-time messaging via WebSockets
- Group conversations with admin controls
- Message delivery/read receipts
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import create_tables
from app.routers import auth, users, contacts, conversations, messages, groups, settings as settings_router, upload
from app.websocket.manager import router as ws_router

app = FastAPI(
    title="Cipher Messenger API",
    description="Signal-inspired secure messaging platform",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["Contacts"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["Conversations"])
app.include_router(messages.router, prefix="/api", tags=["Messages"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(ws_router)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
def on_startup():
    """Create database tables on application startup."""
    create_tables()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "cipher-messenger"}
