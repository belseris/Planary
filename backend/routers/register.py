"""
register.py - API Endpoint สำหรับสมัครสมาชิก (Register)

หน้าที่หลัก:
- POST /register - รับข้อมูลผู้ใช้ใหม่และสร้าง account

การทำงาน:
1. รับ email, username, gender, age, password, confirm_password
2. ตรวจสอบว่า password และ confirm_password ตรงกัน
3. ตรวจสอบว่า email ยังไม่ถูกใช้งาน
4. เข้ารหัสรหัสผ่านด้วย bcrypt
5. บันทึกลงฐานข้อมูล
6. สร้าง UUID ให้อัตโนมัติ
7. ส่งข้อมูล user กลับไป
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from core.security import hash_password
from schemas.register import RegisterRequest, RegisterResponse

router = APIRouter(prefix="/register", tags=["register"])

@router.post("", response_model=RegisterResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    สมัครสมาชิกใหม่
    
    Args:
        payload: RegisterRequest ที่มี email, username, gender, age, password, confirm_password
        db: Database session
    
    Returns:
        RegisterResponse: ข้อมูล user ที่สร้างสำเร็จ
    
    Raises:
        400: ถ้ารหัสผ่านและยืนยันไม่ตรงกัน
        409: ถ้า email ถูกใช้งานแล้ว
    """
    # ตรวจสอบว่ารหัสผ่านและยืนยันรหัสผ่านตรงกัน
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน")
    
    # ตรวจสอบว่า email ยังไม่ถูกใช้งาน (ต้อง unique)
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="อีเมลนี้ถูกใช้แล้ว")

    # สร้าง User ใหม่
    user = User(
        email=payload.email,
        username=payload.username,
        gender=payload.gender,
        age=payload.age,
        password_hash=hash_password(payload.password),  # เข้ารหัสรหัสผ่านด้วย bcrypt
    )
    db.add(user)  # เพิ่มเข้า session
    db.commit()  # บันทึกลงฐานข้อมูล
    db.refresh(user)  # ดึงข้อมูลใหม่จาก DB (เพื่อให้ได้ id ที่ DB สร้างให้)
    return user
