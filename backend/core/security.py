"""
security.py - ระบบความปลอดภัย (Authentication & Authorization)

หน้าที่หลัก:
- เข้ารหัสรหัสผ่านด้วย bcrypt (hash_password)
- ตรวจสอบรหัสผ่านที่ user ป้อนกับ hash ในฐานข้อมูล (verify_password)
- สร้าง JWT access token สำหรับ login (create_access_token)

การทำงาน:
1. ตอน register: hash_password() เข้ารหัสรหัสผ่านก่อนบันทึกลงฐานข้อมูล
2. ตอน login: verify_password() เช็คว่ารหัสผ่านที่ใส่ตรงกับ hash หรือไม่
3. ถ้าถูกต้อง: create_access_token() สร้าง JWT token ที่มี user_id และ expiration time
4. Frontend เก็บ token นี้และส่งมาใน Authorization header ทุกครั้งที่เรียก API
"""

from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from core.config import settings

# ตั้งค่า bcrypt context สำหรับเข้ารหัสรหัสผ่าน
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    เข้ารหัสรหัสผ่านด้วย bcrypt
    
    Args:
        password: รหัสผ่าน plain text ที่ user ป้อนมา
    
    Returns:
        str: รหัสผ่านที่เข้ารหัสแล้ว (hash) เพื่อเก็บในฐานข้อมูล
    """
    return pwd_context.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    """
    ตรวจสอบว่ารหัสผ่านที่ user ป้อนตรงกับ hash ในฐานข้อมูลหรือไม่
    
    Args:
        password: รหัสผ่าน plain text ที่ user ป้อนมาตอน login
        password_hash: รหัสผ่านที่เข้ารหัสแล้วจากฐานข้อมูล
    
    Returns:
        bool: True ถ้ารหัสผ่านถูกต้อง, False ถ้าไม่ตรง
    """
    return pwd_context.verify(password, password_hash)

def create_access_token(subject: str) -> str:
    """
    สร้าง JWT access token สำหรับ user ที่ login สำเร็จ
    
    Args:
        subject: user_id (เป็น string) ที่จะเข้ารหัสใน token
    
    Returns:
        str: JWT token string ที่ frontend จะเก็บและส่งกลับมาใน Authorization header
        
    Token structure:
        - sub: user_id
        - exp: เวลาหมดอายุ (default 120 นาที จาก settings)
    """
    # คำนวณเวลาหมดอายุ = เวลาปัจจุบัน + ระยะเวลาที่กำหนดใน settings
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    # สร้าง payload ที่มี user_id (sub) และเวลาหมดอายุ (exp)
    payload = {"sub": subject, "exp": expire}
    # เข้ารหัส payload เป็น JWT token ด้วย secret_key
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
