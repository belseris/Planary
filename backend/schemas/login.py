"""
login.py - Pydantic Schemas สำหรับ Login API

หน้าที่:
- LoginRequest: ข้อมูลที่รับจาก frontend (email + password)
- TokenResponse: ข้อมูลที่ส่งกลับไป (access_token + token_type)

การใช้งาน:
Frontend ส่ง POST /login/token ด้วย {email, password}
รับ {access_token, token_type: "bearer"} กลับมา
เก็บ token ไว้และส่งใน Authorization: Bearer <token> ทุกครั้งที่เรียก API
"""

from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
