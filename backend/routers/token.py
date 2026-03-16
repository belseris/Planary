"""
token.py - Stateless refresh endpoint using JWT refresh tokens

POST /auth/refresh - รับ refresh_token ใน body และคืน access token ใหม่

การออกแบบ: ใช้ JWT เป็น refresh token (stateless). ตรวจสอบ signature, exp และ type=="refresh".
"""

from fastapi import APIRouter, HTTPException, status
from schemas.login import RefreshRequest
from schemas.login import TokenResponse
from core import security
from jose import ExpiredSignatureError, JWTError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest):
    token = payload.refresh_token
    try:
        decoded = security.decode_token(token)
    except ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # ตรวจสอบว่าเป็น refresh token
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    sub = decoded.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # สร้าง access token ใหม่ (stateless)
    try:
        new_access = security.create_token(str(sub), token_type="access")
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to create access token")

    return TokenResponse(access_token=new_access)
