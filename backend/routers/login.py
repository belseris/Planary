from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from core.security import verify_password, create_access_token
from schemas.login import LoginRequest, TokenResponse

router = APIRouter(prefix="/login", tags=["login"])

@router.post("", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)
