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

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from db.session import get_db
from models.diary import Diary
from models.user import User
from schemas.diary import DiaryCreate, DiaryUpdate, DiaryResponse
from routers.profile import current_user
import datetime
from pathlib import Path
import uuid
from typing import List
from core.config import settings

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

# -------------------------------
# Image management for diaries (filesystem only, no DB migration)
# -------------------------------

ALLOWED_IMAGE_EXTS = {"jpg", "jpeg", "png", "webp"}

def _diary_image_dir(diary_id: str) -> Path:
    return Path(settings.media_dir) / "diary_images" / str(diary_id)

def _ensure_owner(diary_id: str, db: Session, me: User) -> Diary:
    row = db.query(Diary).filter(Diary.id == diary_id, Diary.user_id == me.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    return row

def _list_image_files(folder: Path) -> List[str]:
    if not folder.exists():
        return []
    files = []
    for p in folder.iterdir():
        if p.is_file():
            ext = p.suffix.lower().lstrip(".")
            if ext in ALLOWED_IMAGE_EXTS:
                files.append(p.name)
    return sorted(files)

def _image_url(diary_id: str, filename: str) -> str:
    return f"/media/diary_images/{diary_id}/{filename}"

@router.get("/{diary_id}/images")
def list_diary_images(diary_id: str, db: Session = Depends(get_db), me: User = Depends(current_user)):
    _ensure_owner(diary_id, db, me)
    folder = _diary_image_dir(diary_id)
    files = _list_image_files(folder)
    return {
        "count": len(files),
        "images": [{"name": f, "url": _image_url(diary_id, f)} for f in files],
    }

@router.post("/{diary_id}/images", status_code=201)
async def upload_diary_images(
    diary_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    _ensure_owner(diary_id, db, me)
    folder = _diary_image_dir(diary_id)
    existing = _list_image_files(folder)

    if len(existing) >= 3:
        raise HTTPException(status_code=400, detail="บันทึกนี้มีรูปครบ 3 รูปแล้ว")
    if not files:
        raise HTTPException(status_code=400, detail="กรุณาเลือกไฟล์รูปอย่างน้อย 1 รูป")

    remaining_slots = 3 - len(existing)
    folder.mkdir(parents=True, exist_ok=True)

    added: List[str] = []
    for upload in files[:remaining_slots]:
        if not upload.content_type or not upload.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"ไฟล์ {upload.filename} ไม่ใช่รูปภาพ")

        ext = Path(upload.filename or "").suffix.lower().lstrip(".") or "jpg"
        if ext not in ALLOWED_IMAGE_EXTS:
            ext = "jpg"

        filename = f"{uuid.uuid4().hex}.{ext}"
        target = folder / filename
        try:
            content = await upload.read()
            target.write_bytes(content)
        except Exception as exc:  # pragma: no cover - file system error
            raise HTTPException(status_code=500, detail=f"บันทึกรูปล้มเหลว: {exc}")

        added.append(filename)

    new_existing = existing + added
    return {
        "added": [{"name": n, "url": _image_url(diary_id, n)} for n in added],
        "remaining_slots": max(0, 3 - len(new_existing)),
    }

@router.delete("/{diary_id}/images/{filename}", status_code=204)
def delete_diary_image(
    diary_id: str,
    filename: str,
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    _ensure_owner(diary_id, db, me)
    folder = _diary_image_dir(diary_id)
    target = folder / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์นี้ในบันทึก")
    try:
        target.unlink()
    except Exception as exc:  # pragma: no cover - file system error
        raise HTTPException(status_code=500, detail=f"ลบไฟล์ไม่สำเร็จ: {exc}")
    return None
