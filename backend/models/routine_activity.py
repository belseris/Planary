"""
routine_activity.py - Model สำหรับตาราง routine_activities ในฐานข้อมูล

หน้าที่:
- เก็บ "แม่แบบกิจกรรมประจำ" ที่ทำซ้ำทุกสัปดาห์
- ระบุวันในสัปดาห์ (day_of_week) และเวลา (time)
- ใช้เป็นแม่แบบสำหรับสร้าง Activity จริงๆ ในแต่ละสัปดาห์

ความสัมพันธ์:
- RoutineActivity belongs to User (many-to-one)
- RoutineActivity มีหลาย Activities (one-to-many) ที่สร้างจากแม่แบบนี้

ตัวอย่างการใช้งาน:
- User สร้าง Routine "ออกกำลังกาย" ทุกวันจันทร์ เวลา 06:00
- ระบบจะสร้าง Activity "ออกกำลังกาย" ทุกวันจันทร์โดยอัตโนมัติ
- Activity ที่สร้างจาก routine จะมี routine_id ชี้กลับมาที่ RoutineActivity นี้
"""

import uuid
from sqlalchemy import Column, String, Time, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from db.session import Base

class RoutineActivity(Base):
    __tablename__ = "routine_activities"

    # UUID primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key ไปที่ User
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # วันในสัปดาห์: "mon", "tue", "wed", "thu", "fri", "sat", "sun"
    day_of_week = Column(String(10), nullable=False)
    
    # ชื่อกิจกรรม (แม่แบบ)
    title = Column(String(255), nullable=False)
    
    # Category: "work", "personal", "health", "social", etc.
    category = Column(String(100), nullable=True)
    
    # เวลาของกิจกรรม (optional)
    time = Column(Time, nullable=True)
    
    # Notes: รายละเอียดเพิ่มเติมของแม่แบบ (จะถูกคัดลอกไปยัง Activity)
    notes = Column(String(2000), nullable=True)
    
    # Subtasks: งานย่อยของแม่แบบ (จะถูกคัดลอกไปยัง Activity)
    # เช่น [{"id": "uuid", "text": "งานย่อย 1", "completed": false}]
    subtasks = Column(JSONB, nullable=True)