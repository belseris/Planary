from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.diary import Diary
from models.user import User
from schemas.diary import DiaryCreate, DiaryUpdate, DiaryResponse
from routers.profile import current_user

ALLOWED_MOODS = {"happy", "neutral", "sad", "angry", "cry"}

router = APIRouter(prefix="/diary", tags=["diary"])

@router.post("", response_model=DiaryResponse, status_code=201)
def create_diary(payload: DiaryCreate, db: Session = Depends(get_db), me: User = Depends(current_user)):
    if payload.mood not in ALLOWED_MOODS:
        raise HTTPException(status_code=400, detail="mood ไม่ถูกต้อง")
    row = Diary(
        user_id=me.id,
        date=payload.date, time=payload.time,
        title=payload.title, detail=payload.detail,
        mood=payload.mood, tags=payload.tags,
    )
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("/{diary_id}", response_model=DiaryResponse)
def get_diary(diary_id: str, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Diary).filter(Diary.id == diary_id, Diary.user_id == me.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    return row

@router.put("/{diary_id}", response_model=DiaryResponse)
def update_diary(diary_id: str, payload: DiaryUpdate, db: Session = Depends(get_db), me: User = Depends(current_user)):
    if payload.mood not in ALLOWED_MOODS:
        raise HTTPException(status_code=400, detail="mood ไม่ถูกต้อง")
    row = db.query(Diary).filter(Diary.id == diary_id, Diary.user_id == me.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    row.date = payload.date; row.time = payload.time
    row.title = payload.title; row.detail = payload.detail
    row.mood = payload.mood; row.tags = payload.tags
    db.add(row); db.commit(); db.refresh(row)
    return row
