"""
register.py - Pydantic Schemas สำหรับ Register API

หน้าที่:
- RegisterRequest: ข้อมูลที่รับจาก frontend ตอนสมัครสมาชิก
- RegisterResponse: ข้อมูล user ที่สร้างสำเร็จ (ส่งกลับไป)

Validation:
- email: ต้องเป็น email format ที่ถูกต้อง
- username: 2-100 ตัวอักษร
- age: 1-120 ปี
- password: อย่างน้อย 6 ตัวอักษร
- confirm_password: ต้องตรงกับ password (เช็คใน router)
"""

from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=100)
    gender: str
    age: int = Field(..., ge=1, le=120)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

class RegisterResponse(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    gender: str
    age: int
    avatar_url: str | None = None

    class Config:
        from_attributes = True
