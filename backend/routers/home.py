"""
home.py - API Endpoints สำหรับหน้าหลัก (Home)

หน้าที่หลัก:
- GET /home/diaries - ดึงรายการไดอารี่แบบมี pagination (limit + offset)
- DELETE /home/diaries/{id} - ลบไดอารี่ (duplicate กับ /diary/{id} แต่เก็บไว้เพื่อ backward compatibility)

การใช้งาน:
- Frontend เรียก GET /home/diaries?limit=20&offset=0 เพื่อแสดงรายการไดอารี่ล่าสุด
- รองรับ pagination เพื่อไม่ให้โหลดข้อมูลทั้งหมดพร้อมกัน (ประหยัด bandwidth)
- ส่ง total count กลับไปด้วยเพื่อให้ frontend รู้ว่ามีทั้งหมดกี่รายการ

หมายเหตุ:
- อาจรวม endpoint นี้เข้ากับ /diary ได้ในอนาคต
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from db.session import get_db
from models.diary import Diary
from schemas.home import DiaryListResponse, DiaryItem
from routers.profile import current_user
from models.user import User

router = APIRouter(prefix="/home", tags=["home"])

@router.get("/diaries", response_model=DiaryListResponse)
def list_diaries(
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(Diary).filter(Diary.user_id == me.id).order_by(Diary.date.desc(), Diary.time.desc())
    total = q.count()
    rows = q.offset(offset).limit(limit).all()
    items = [DiaryItem.model_validate(r) for r in rows]
    return DiaryListResponse(items=items, total=total)

@router.delete("/diaries/{diary_id}", status_code=204)
def delete_diary(diary_id: str, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Diary).filter(Diary.id == diary_id, Diary.user_id == me.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    db.delete(row)
    db.commit()
    return
