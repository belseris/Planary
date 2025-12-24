"""
diary.py - Model สำหรับตาราง diaries ในฐานข้อมูล

หน้าที่หลัก:
- เก็บข้อมูลบันทึกประจำวัน (diary entries)
- แต่ละรายการมี title, detail, date, time
- รองรับ 2D Mood System:
    - positive_score, negative_score, mood_score (overall)
    - mood_tags: emoji tags ที่เลือก
- เก็บ list ของกิจกรรมที่ทำในวันนั้น (activities)
"""

import uuid
from sqlalchemy import Column, String, Integer, Date, Time, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from db.session import Base


class Diary(Base):
    __tablename__ = "diaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ผู้เขียนบันทึก
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # วันที่และเวลา
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)

    # หัวข้อและรายละเอียดบันทึก
    title = Column(String(200), nullable=False)
    detail = Column(String(2000), nullable=True)

    # emoji หลักของอารมณ์ในวันนั้น (เช่น 😊 😞)
    mood = Column(String(20), nullable=True)

    # คะแนนอารมณ์
    # positive_score: คะแนนเรื่องดี 1–5
    # negative_score: คะแนนเรื่องแย่ 1–5
    # mood_score: คะแนนภาพรวมทั้งวัน 1–5
    positive_score = Column(Integer, nullable=True)
    negative_score = Column(Integer, nullable=True)
    mood_score = Column(Integer, nullable=True)

    # mood_tags: รายการ emoji ที่เลือกเป็นปัจจัยของอารมณ์
    # เช่น ["😊", "💪", "📚"]
    mood_tags = Column(JSONB, nullable=True)

    # tags ธรรมดาเพื่อค้นหา (ถ้าอยากใช้ keyword)
    tags = Column(String(255), nullable=True)

    # กิจกรรมที่ทำในวันนั้น (เก็บเป็น JSON)
    # ตัวอย่าง: [{"title": "ออกกำลังกาย", "category": "health"}, ...]
    activities = Column(JSONB, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
