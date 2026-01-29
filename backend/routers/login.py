"""
login.py - API Endpoint สำหรับเข้าสู่ระบบ (Login)

หน้าที่หลัก:
- POST /login/token - รับ email + password แล้วส่ง JWT token กลับ

การทำงาน:
1. รับ email และ password จาก request body
2. หา user ในฐานข้อมูลด้วย email
3. ตรวจสอบรหัสผ่านด้วย bcrypt (verify_password)
4. ถ้าถูกต้อง: สร้าง JWT token ที่มี user_id และเวลาหมดอายุ
5. ส่ง token กลับไป
6. Frontend เก็บ token นี้และส่งมาใน Authorization header ทุกครั้งที่เรียก API

Token format:
- access_token: JWT string ที่เข้ารหัส user_id และ expiration time
- Frontend ส่งกลับมาใน header: Authorization: Bearer <token>
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from core.security import verify_password, create_access_token
from schemas.login import LoginRequest, TokenResponse

router = APIRouter(prefix="/login", tags=["login"])
logger = logging.getLogger(__name__)

@router.post("/token", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    เข้าสู่ระบบด้วย email และ password
    
    Args:
        payload: LoginRequest ที่มี email และ password
        db: Database session
    
    Returns:
        TokenResponse: มี access_token (JWT) สำหรับใช้งาน API
    
    Raises:
        401: ถ้า email ไม่พบหรือรหัสผ่านไม่ถูกต้อง
    """
    # หา user ด้วย email
    user = db.query(User).filter(User.email == payload.email).first()

    # ตรวจสอบว่า user มีอยู่และรหัสผ่านถูกต้อง
    try:
        password_ok = verify_password(payload.password, user.password_hash) if user else False
    except ValueError:
        # bcrypt limit: 72 bytes
        raise HTTPException(status_code=400, detail="รหัสผ่านยาวเกินไป (สูงสุด 72 อักขระ)")
    except Exception:
        # กรณี hash เก่า/รูปแบบไม่รองรับ จะไม่ส่ง 500 กลับไป
        logger.exception("Password verification failed")
        raise HTTPException(status_code=400, detail="รหัสผ่านไม่ถูกต้องหรือรูปแบบรหัสผ่านไม่รองรับ")

    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง"
        )
    
    # สร้าง JWT token พร้อม user_id
    try:
        token = create_access_token(str(user.id))
    except Exception:
        logger.exception("Token creation failed")
        raise HTTPException(status_code=500, detail="ไม่สามารถออกโทเคนได้")
    
    # ส่ง token กลับไป
    return TokenResponse(access_token=token)
