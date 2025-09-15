from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from uuid import UUID
import os, uuid as uuidlib
from db.session import get_db
from core.config import settings
from models.user import User
from schemas.profile import ProfileMe, ProfileUpdateRequest, PasswordChangeRequest
from core.security import verify_password, hash_password

router = APIRouter(prefix="/profile", tags=["profile"])
bearer = HTTPBearer(auto_error=True)

def current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    token = cred.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        uid = payload.get("sub")
        user = db.get(User, UUID(uid))
    except (JWTError, ValueError):
        user = None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ไม่ถูกต้อง")
    return user

@router.get("/me", response_model=ProfileMe)
def get_me(me: User = Depends(current_user)):
    return me

@router.put("/update", response_model=ProfileMe)
def update_profile(payload: ProfileUpdateRequest, db: Session = Depends(get_db), me: User = Depends(current_user)):
    me.username = payload.username
    me.gender = payload.gender
    me.age = payload.age
    db.add(me)
    db.commit()
    db.refresh(me)
    return me

@router.patch("/password")
def change_password(payload: PasswordChangeRequest, db: Session = Depends(get_db), me: User = Depends(current_user)):
    if not verify_password(payload.old_password, me.password_hash):
        raise HTTPException(status_code=400, detail="รหัสผ่านเดิมไม่ถูกต้อง")
    me.password_hash = hash_password(payload.new_password)
    db.add(me)
    db.commit()
    return {"detail": "เปลี่ยนรหัสผ่านสำเร็จ"}

@router.post("/avatar", response_model=ProfileMe)
def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), me: User = Depends(current_user)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์ภาพ .png .jpg .jpeg .webp")
    fname = f"{uuidlib.uuid4()}{ext}"
    fpath = os.path.join(settings.avatars_dir, fname)
    with open(fpath, "wb") as f:
        f.write(file.file.read())
    me.avatar_url = f"/media/avatars/{fname}"
    db.add(me)
    db.commit()
    db.refresh(me)
    return me
