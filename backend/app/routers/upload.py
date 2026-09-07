from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import shutil
import uuid
from pathlib import Path

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("")
@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    try:
        # Generate a unique filename
        ext = ""
        if "." in file.filename:
            ext = "." + file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        
        file_path = UPLOAD_DIR / unique_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "url": f"/uploads/{unique_filename}",
            "filename": file.filename,
            "content_type": file.content_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
