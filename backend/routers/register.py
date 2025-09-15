from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from core.security import hash_password
from schemas.register import RegisterRequest, RegisterResponse

router = APIRouter(prefix="/register", tags=["register"])

@router.post("", response_model=RegisterResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="อีเมลนี้ถูกใช้แล้ว")

    user = User(
        email=payload.email,
        username=payload.username,
        gender=payload.gender,
        age=payload.age,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
