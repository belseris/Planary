"""
profile.py - API Endpoints สำหรับจัดการโปรไฟล์ (Profile)

หน้าที่หลัก:
- GET /profile/me - ดึงข้อมูลโปรไฟล์ของ user ที่ login
- PUT /profile/update - แก้ไข username, gender, age
- PATCH /profile/password - เปลี่ยนรหัสผ่าน
- POST /profile/avatar - อัปโหลดรูปโปรไฟล์

ฟังก์ชันสำคัญ:
- current_user(): Dependency สำหรับตรวจสอบ JWT token และดึง User object
  - ถอดรหัส token จาก Authorization header
  - decode JWT เพื่อดึง user_id
  - query User จากฐานข้อมูล
  - ใช้ใน router อื่นๆ เป็น Depends(current_user) เพื่อรับ User object

การ upload avatar:
- รับไฟล์รูป multipart/form-data
- สร้างชื่อไฟล์ใหม่ด้วย UUID เพื่อไม่ให้ชื่อซ้ำกัน
- บันทึกไฟล์ลง media/avatars/
- บันทึก avatar_url ลงฐานข้อมูล
"""

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

# HTTPBearer: ตรวจสอบว่า Authorization header มี Bearer token หรือไม่
bearer = HTTPBearer(auto_error=True)

def current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency function สำหรับตรวจสอบ JWT token และดึง User object
    
    การทำงาน:
    1. ดึง Bearer token จาก Authorization header
    2. Decode JWT เพื่อดึง user_id (sub claim)
    3. Query User จากฐานข้อมูลด้วย user_id
    4. ถ้า token ไม่ถูกต้องหรือหา user ไม่เจอ: โยน 401 Unauthorized
    
    การใช้งาน:
        @router.get("/something")
        def some_endpoint(me: User = Depends(current_user)):
            # me จะเป็น User object ของคนที่ login
            pass
    
    Returns:
        User: User object ของคนที่ login
    
    Raises:
        401: ถ้า token ไม่ถูกต้อง, หมดอายุ, หรือหา user ไม่เจอ
    """
    token = cred.credentials  # ดึง token string จาก Bearer header
    try:
        # Decode JWT เพื่อดึง payload
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        uid = payload.get("sub")  # "sub" claim เก็บ user_id
        user = db.get(User, UUID(uid))  # Query user จากฐานข้อมูล
    except (JWTError, ValueError):
        # Token ไม่ถูกต้อง, หมดอายุ, หรือ decode ไม่ได้
        user = None
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ไม่ถูกต้อง")
    
    return user

@router.get("/me", response_model=ProfileMe)
def get_me(me: User = Depends(current_user)):
    """ดึงข้อมูลโปรไฟล์ของ user ที่ login"""
    return me

@router.put("/update", response_model=ProfileMe)
def update_profile(payload: ProfileUpdateRequest, db: Session = Depends(get_db), me: User = Depends(current_user)):
    """
    แก้ไขข้อมูลโปรไฟล์ (username, gender, age)
    หมายเหตุ: email แก้ไม่ได้ (เพราะเป็น unique identifier)
    """
    me.username = payload.username
    me.gender = payload.gender
    me.age = payload.age
    db.add(me)
    db.commit()
    db.refresh(me)
    return me

@router.patch("/password")
def change_password(payload: PasswordChangeRequest, db: Session = Depends(get_db), me: User = Depends(current_user)):
    """
    เปลี่ยนรหัสผ่าน
    ต้องส่ง old_password และ new_password
    ระบบจะตรวจสอบรหัสผ่านเดิมก่อนจึงอนุญาตให้เปลี่ยน
    """
    # ตรวจสอบรหัสผ่านเดิม
    if not verify_password(payload.old_password, me.password_hash):
        raise HTTPException(status_code=400, detail="รหัสผ่านเดิมไม่ถูกต้อง")
    
    # เข้ารหัสและบันทึกรหัสผ่านใหม่
    me.password_hash = hash_password(payload.new_password)
    db.add(me)
    db.commit()
    return {"detail": "เปลี่ยนรหัสผ่านสำเร็จ"}

@router.post("/avatar", response_model=ProfileMe)
def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), me: User = Depends(current_user)):
    """
    อัปโหลดรูปโปรไฟล์
    รับไฟล์รูป multipart/form-data
    รองรับ: .png .jpg .jpeg .webp
    บันทึกไฟล์ลง media/avatars/ และอัปเดต avatar_url ในฐานข้อมูล
    """
    # ตรวจสอบนามสกุลไฟล์
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์ภาพ .png .jpg .jpeg .webp")
    
    # สร้างชื่อไฟล์ใหม่ด้วย UUID เพื่อไม่ให้ชื่อซ้ำกัน
    fname = f"{uuidlib.uuid4()}{ext}"
    fpath = os.path.join(settings.avatars_dir, fname)
    
    # บันทึกไฟล์ลง disk
    with open(fpath, "wb") as f:
        f.write(file.file.read())
    
    # อัปเดต avatar_url ในฐานข้อมูล (เป็น relative path)
    me.avatar_url = f"/media/avatars/{fname}"
    db.add(me)
    db.commit()
    db.refresh(me)
    return me
