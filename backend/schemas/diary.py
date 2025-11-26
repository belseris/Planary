"""
diary.py - Pydantic Schemas สำหรับ Diary API validation

หน้าที่หลัก:
- กำหนดรูปแบบข้อมูลที่รับ/ส่งผ่าน API
- Validate ข้อมูลก่อนเข้าฐานข้อมูล
- Convert ข้อมูลจาก model เป็น JSON response

Schemas:
- ActivityFeedback: ข้อมูลกิจกรรมพร้อม rating ที่บันทึกใน diary
- DiaryCreate: สำหรับสร้าง diary ใหม่ (POST)
- DiaryUpdate: สำหรับแก้ไข diary (PUT) - ทุก field เป็น optional
- DiaryResponse: รูปแบบข้อมูลที่ส่งกลับไป

2D Mood System:
- mood_score: รับได้ทั้ง int (1-5) หรือ string ('good'/'bad')
- mood_tags: array ของ emoji tags เช่น ['😊', '🚀', '💪']
"""

from pydantic import BaseModel, Field
import datetime
from uuid import UUID
from typing import List, Union, Optional

class ActivityFeedback(BaseModel):
    """ข้อมูลกิจกรรมพร้อม rating และ mood ที่บันทึกลง diary"""
    id: str  # Activity ID
    category: str  # หมวดหมู่กิจกรรม
    title: str  # ชื่อกิจกรรม
    rating: int  # คะแนนที่ให้ (ใช้ในการสรุปกิจกรรม)
    activityMood: str  # อารมณ์จากกิจกรรม

class DiaryCreate(BaseModel):
    date: datetime.date
    time: Optional[datetime.time] = None
    title: str = Field(..., min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=2000)
    mood: str | None = None
    # Accept either legacy strings ('good'/'bad') or integer rating 1..5
    mood_score: Optional[Union[int, str]] = None
    mood_tags: List[str] | None = None  # ['😊', '🚀', ...]
    tags: str | None = None
    activities: List[ActivityFeedback] | None = None

class DiaryUpdate(BaseModel):
    # Make all fields optional for partial updates
    date: Optional[datetime.date] = None
    time: Optional[datetime.time] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    detail: Optional[str] = Field(None, max_length=2000)
    mood: Optional[str] = None
    mood_score: Optional[Union[int, str]] = None
    mood_tags: Optional[List[str]] = None  # ['😊', '🚀', ...]
    tags: Optional[str] = None
    activities: Optional[List[ActivityFeedback]] = None

class DiaryResponse(BaseModel):
    id: UUID
    date: datetime.date
    time: datetime.time
    title: str
    detail: str | None = None
    mood: str | None = None
    mood_score: Optional[Union[int, str]] = None
    mood_tags: List[str] | None = None
    tags: str | None = None
    activities: List[ActivityFeedback] | None = None

    class Config:
        from_attributes = True
