"""
diary.py - API Endpoints สำหรับจัดการไดอารี่ (Diary)

หน้าที่หลัก:
- GET /diary - ดึงรายการไดอารี่ทั้งหมด (มี filter ตาม date range)
- POST /diary - สร้างไดอารี่ใหม่
- GET /diary/{id} - ดึงไดอารี่ตัวเดียว
- PUT /diary/{id} - แก้ไขไดอารี่
- DELETE /diary/{id} - ลบไดอารี่

คุณสมบัติพิเศษ:
- รองรับ 2D Mood System (mood_score + mood_tags)
- รองรับ partial update (แก้ไขเฉพาะ field ที่ส่งมา)
- แปลง mood_score จาก int/string และ validate ให้อัตโนมัติ
- ใช้ default mood "😌" ถ้าไม่ส่ง mood มา (เพื่อป้องกัน NOT NULL error)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.diary import Diary
from models.user import User
from schemas.diary import DiaryCreate, DiaryUpdate, DiaryResponse
from routers.profile import current_user
import datetime

# Legacy mood emojis ที่รองรับ (เก็บไว้เพื่อ backward compatibility)
# Include emojis from YesterdayDiaryModal: 😄 (score >= 4), 😐 (score === 3), 😞 (score < 3)
ALLOWED_MOODS = {"🙂", "😄", "😢", "😠", "😌", "🤩", "😐", "😞"}

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
        raise HTTPException(status_code=400, detail=f"mood '{payload.mood}' ไม่ถูกต้อง ต้องเป็น {ALLOWED_MOODS}")
    
    # แปลง activities เป็น list of dict ถ้ามีข้อมูล
    activities_data = None
    if payload.activities:
        activities_data = [activity.dict() for activity in payload.activities]
    
    # mood_score validation
    # Accept legacy 'good'|'bad' or numeric rating 1..5
    if payload.mood_score is not None:
        # numeric case
        if isinstance(payload.mood_score, int):
            if not (1 <= payload.mood_score <= 5):
                raise HTTPException(status_code=400, detail="mood_score numeric ต้องอยู่ระหว่าง 1 และ 5")
            stored_mood_score = str(payload.mood_score)
        else:
            # string case: accept 'good'|'bad' or numeric string
            if payload.mood_score not in ['good', 'bad']:
                # try numeric string
                try:
                    v = int(payload.mood_score)
                    if not (1 <= v <= 5):
                        raise HTTPException(status_code=400, detail="mood_score ต้องเป็น 'good'|'bad' หรือ 1..5")
                    stored_mood_score = str(v)
                except Exception:
                    raise HTTPException(status_code=400, detail="mood_score ต้องเป็น 'good'|'bad' หรือ 1..5")
        
    else:
        stored_mood_score = None
    
    # Use default time if not provided
    diary_time = payload.time if payload.time else datetime.time(0, 0, 0)
    
    # Use default mood if not provided (DB constraint requires non-null)
    diary_mood = payload.mood if payload.mood else "😌"
    
    row = Diary(
        user_id=me.id,
        date=payload.date, time=diary_time,
        title=payload.title, detail=payload.detail,
        mood=diary_mood, tags=payload.tags,
        positive_score=payload.positive_score,
        negative_score=payload.negative_score,
        mood_score=stored_mood_score,
        mood_tags=payload.mood_tags,
        activities=activities_data
    )
    db.add(row); db.commit(); db.refresh(row)
    # If mood_score is numeric string, convert to int for response convenience
    try:
        if row.mood_score is not None and isinstance(row.mood_score, str) and row.mood_score.isdigit():
            row.mood_score = int(row.mood_score)
    except Exception:
        pass
    return row

@router.get("/{diary_id}", response_model=DiaryResponse)
def get_diary(diary_id: str, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Diary).filter(Diary.id == diary_id, Diary.user_id == me.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    return row

@router.put("/{diary_id}", response_model=DiaryResponse)
def update_diary(diary_id: str, payload: DiaryUpdate, db: Session = Depends(get_db), me: User = Depends(current_user)):
    # Support partial updates: only apply fields that were sent by the client
    update_data = payload.model_dump(exclude_unset=True)

    # mood อาจเป็น null (draft mode)
    if update_data.get('mood') and update_data.get('mood') not in ALLOWED_MOODS:
        raise HTTPException(status_code=400, detail=f"mood '{update_data.get('mood')}' ไม่ถูกต้อง")

    row = db.query(Diary).filter(Diary.id == diary_id, Diary.user_id == me.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")

    # แปลง activities เป็น list of dict ถ้ามีข้อมูล
    activities_data = None
    if 'activities' in update_data and update_data.get('activities') is not None:
        activities_data = [a.model_dump() if hasattr(a, 'model_dump') else a for a in update_data.get('activities')]

    # mood_score validation (only when provided)
    stored_mood_score = None
    if 'mood_score' in update_data:
        ms = update_data.get('mood_score')
        if ms is not None:
            if isinstance(ms, int):
                if not (1 <= ms <= 5):
                    raise HTTPException(status_code=400, detail="mood_score numeric ต้องอยู่ระหว่าง 1 และ 5")
                stored_mood_score = str(ms)
            else:
                if ms not in ['good', 'bad']:
                    try:
                        v = int(ms)
                        if not (1 <= v <= 5):
                            raise HTTPException(status_code=400, detail="mood_score ต้องเป็น 'good'|'bad' หรือ 1..5")
                        stored_mood_score = str(v)
                    except Exception:
                        raise HTTPException(status_code=400, detail="mood_score ต้องเป็น 'good'|'bad' หรือ 1..5")

    # Apply only provided fields
    if 'date' in update_data:
        row.date = update_data.get('date')
    if 'time' in update_data:
        row.time = update_data.get('time')
    if 'title' in update_data:
        row.title = update_data.get('title')
    if 'detail' in update_data:
        row.detail = update_data.get('detail')
    if 'mood' in update_data:
        row.mood = update_data.get('mood')
    if 'tags' in update_data:
        row.tags = update_data.get('tags')
    if 'positive_score' in update_data:
        row.positive_score = update_data.get('positive_score')
    if 'negative_score' in update_data:
        row.negative_score = update_data.get('negative_score')
    if 'mood_score' in update_data:
        row.mood_score = stored_mood_score
    if 'mood_tags' in update_data:
        row.mood_tags = update_data.get('mood_tags')
    if activities_data is not None:
        row.activities = activities_data
    db.add(row); db.commit(); db.refresh(row)
    try:
        if row.mood_score is not None and isinstance(row.mood_score, str) and row.mood_score.isdigit():
            row.mood_score = int(row.mood_score)
    except Exception:
        pass
    return row

@router.delete("/{diary_id}", status_code=204)
def delete_diary(diary_id: str, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Diary).filter(Diary.id == diary_id, Diary.user_id == me.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    db.delete(row)
    db.commit()
    return None
