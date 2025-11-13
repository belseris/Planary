from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.diary import Diary
from models.user import User
from schemas.diary import DiaryCreate, DiaryUpdate, DiaryResponse
from routers.profile import current_user

ALLOWED_MOODS = {"🙂", "😄", "😢", "😠", "😌", "🤩"}

router = APIRouter(prefix="/diary", tags=["diary"])

@router.get("", response_model=list[DiaryResponse])
def list_diaries(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    query = db.query(Diary).filter(Diary.user_id == me.id)
    if start_date:
        query = query.filter(Diary.date >= start_date)
    if end_date:
        query = query.filter(Diary.date <= end_date)
    return query.order_by(Diary.date.desc(), Diary.time.desc()).all()

@router.post("", response_model=DiaryResponse, status_code=201)
def create_diary(payload: DiaryCreate, db: Session = Depends(get_db), me: User = Depends(current_user)):
    # mood อาจเป็น null (draft mode)
    if payload.mood and payload.mood not in ALLOWED_MOODS:
        raise HTTPException(status_code=400, detail="mood ไม่ถูกต้อง")
    
    # แปลง activities เป็น list of dict ถ้ามีข้อมูล
    activities_data = None
    if payload.activities:
        activities_data = [activity.dict() for activity in payload.activities]
    
    # mood_score validation
    if payload.mood_score and payload.mood_score not in ['good', 'bad']:
        raise HTTPException(status_code=400, detail="mood_score ต้องเป็น 'good' หรือ 'bad'")
    
    row = Diary(
        user_id=me.id,
        date=payload.date, time=payload.time,
        title=payload.title, detail=payload.detail,
        mood=payload.mood, tags=payload.tags,
        mood_score=payload.mood_score,
        mood_tags=payload.mood_tags,
        activities=activities_data
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
    # mood อาจเป็น null (draft mode)
    if payload.mood and payload.mood not in ALLOWED_MOODS:
        raise HTTPException(status_code=400, detail="mood ไม่ถูกต้อง")
    
    row = db.query(Diary).filter(Diary.id == diary_id, Diary.user_id == me.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    
    # แปลง activities เป็น list of dict ถ้ามีข้อมูล
    activities_data = None
    if payload.activities:
        activities_data = [activity.dict() for activity in payload.activities]
    
    # mood_score validation
    if payload.mood_score and payload.mood_score not in ['good', 'bad']:
        raise HTTPException(status_code=400, detail="mood_score ต้องเป็น 'good' หรือ 'bad'")
    
    row.date = payload.date; row.time = payload.time
    row.title = payload.title; row.detail = payload.detail
    row.mood = payload.mood; row.tags = payload.tags
    row.mood_score = payload.mood_score
    row.mood_tags = payload.mood_tags
    row.activities = activities_data
    db.add(row); db.commit(); db.refresh(row)
    return row
