"""
user.py - Model สำหรับตาราง users ในฐานข้อมูล

หน้าที่:
- เก็บข้อมูลผู้ใช้งาน (email, username, gender, age, password, avatar)
- ใช้ UUID เป็น primary key
- email ต้อง unique และมี index เพื่อความเร็วในการค้นหา
- password_hash เก็บรหัสผ่านที่เข้ารหัสด้วย bcrypt (ไม่เก็บ plain text)

ความสัมพันธ์:
- User มีหลาย Diaries (one-to-many)
- User มีหลาย Activities (one-to-many)
- User มีหลาย RoutineActivities (one-to-many)
"""

import uuid
from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from db.session import Base

class User(Base):
    __tablename__ = "users"

    # UUID primary key: ใช้ uuid4 สร้างแบบสุ่ม
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Email: ต้อง unique และมี index เพื่อเร่งความเร็วในการ login
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # Username: ชื่อแสดงผลในแอป
    username = Column(String(100), nullable=False)
    
    # Gender: "ชาย" หรือ "หญิง"
    gender = Column(String(10), nullable=False)
    
    # Age: อายุของ user
    age = Column(Integer, nullable=False)
    
    # Password Hash: รหัสผ่านที่เข้ารหัสแล้วด้วย bcrypt (ไม่เก็บ plain text)
    password_hash = Column(String(255), nullable=False)
    
    # Avatar URL: path ของรูปโปรไฟล์ เช่น "media/avatars/uuid.jpg"
    # สามารถเป็น null ได้ (ถ้ายังไม่อัปโหลดรูป)
    avatar_url = Column(String(512), nullable=True)
