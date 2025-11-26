"""
diary.py - Model สำหรับตาราง diaries ในฐานข้อมูล

หน้าที่:
- เก็บข้อมูลบันทึกประจำวัน (diary entries)
- แต่ละ entry มี title, detail, date, time
- รองรับ 2D Mood System (mood_score + mood_tags)
- เก็บ list ของกิจกรรมที่ทำในวันนั้น (activities)

ความสัมพันธ์:
- Diary belongs to User (many-to-one)
- user_id เป็น foreign key ไปที่ users.id
- ondelete="CASCADE": ถ้าลบ user จะลบ diaries ทั้งหมดของ user นั้นด้วย

2D Mood System:
- mood_score: คะแนนความรู้สึก (1-5 ดาว แปลงเป็น 'good'/'bad')
- mood_tags: array ของ emoji tags เช่น ['😊', '🚀', '💪']
"""

import uuid
from sqlalchemy import Column, String, Integer, Date, Time, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from db.session import Base

class Diary(Base):
    __tablename__ = "diaries"

    # UUID primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key ไปที่ User
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # วันที่และเวลาของ diary entry
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    
    # หัวข้อและรายละเอียด
    title = Column(String(200), nullable=False)
    detail = Column(String(2000), nullable=True)  # เนื้อหาบันทึก (สูงสุด 2000 ตัวอักษร)
    
    # Legacy mood field (เก็บไว้เพื่อความเข้ากันได้ย้อนหลัง)
    mood = Column(String(20), nullable=True)
    
    # 2D Mood System (ระบบใหม่)
    mood_score = Column(String(10), nullable=True)  # 'good' (4-5 ดาว) | 'bad' (1-3 ดาว)
    mood_tags = Column(JSONB, nullable=True)  # ['😊', '🚀', '💪'] - emoji tags ที่เลือก
    
    # Tags: คำที่ใช้ค้นหา diary
    tags = Column(String(255), nullable=True)
    
    # Activities: array ของกิจกรรมที่ทำในวันนั้น
    # เช่น [{"title": "ออกกำลังกาย", "category": "health"}, ...]
    activities = Column(JSONB, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)  # วันเวลาที่สร้าง
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())  # วันเวลาที่แก้ไขล่าสุด
