"""
activity.py - Model สำหรับตาราง activities ในฐานข้อมูล

หน้าที่:
- เก็บข้อมูลกิจกรรมประจำวัน (tasks, events)
- รองรับ all-day events และ timed events
- มีระบบ status (normal, urgent, done, cancelled)
- รองรับ subtasks (รายการย่อยภายในกิจกรรม)
- รองรับการแจ้งเตือน (remind)
- เชื่อมโยงกับ RoutineActivity (routine_id) สำหรับกิจกรรมที่สร้างจากแม่แบบ

ความสัมพันธ์:
- Activity belongs to User (many-to-one)
- Activity may belong to RoutineActivity (many-to-one, optional)
"""

import uuid
from sqlalchemy import JSON, Column, String, Boolean, Integer, Date, Time, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from db.session import Base

class Activity(Base):
    __tablename__ = "activities"

    # UUID primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key ไปที่ User
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Foreign key ไปที่ RoutineActivity (optional)
    # ใช้อ้างอิงว่ากิจกรรมนี้ถูกสร้างมาจาก "แม่แบบกิจกรรมประจำ" ตัวไหน
    # เช่น "ออกกำลังกาย" ที่สร้างทุกวันจันทร์จาก routine
    routine_id = Column(UUID(as_uuid=True), ForeignKey("routine_activities.id"), nullable=True)

    # วันที่ของกิจกรรม
    date = Column(Date, nullable=False)
    
    # All-day event: ถ้า true แสดงว่ากิจกรรมนี้ไม่มีเวลาเฉพาะ (เป็นกิจกรรมทั้งวัน)
    all_day = Column(Boolean, default=False)
    
    # เวลาของกิจกรรม (ถ้าไม่ใช่ all-day)
    time = Column(Time, nullable=True)
    
    # ชื่อกิจกรรม
    title = Column(String(200), nullable=False)
    
    # Category: "work", "personal", "health", "social", etc.
    category = Column(String(30), nullable=True)
    
    # Status: "normal", "urgent", "done", "cancelled"
    status = Column(String(12), default="normal")
    
    # Reminder settings
    remind = Column(Boolean, default=False)  # เปิด/ปิดการแจ้งเตือน
    remind_offset_min = Column(Integer, default=5)  # แจ้งเตือนก่อนกี่นาที (default 5 นาที)
    remind_type = Column(String(20), default="simple")  # "simple" | "detailed" | "urgent"
    remind_sound = Column(Boolean, default=True)  # เปิด/ปิดเสียง
    notification_sent = Column(Boolean, default=False)  # ส่งแจ้งเตือนแล้วหรือยัง
    
    # Notes: รายละเอียดเพิ่มเติม
    notes = Column(String(2000), nullable=True)
    
    # Subtasks: รายการย่อยภายในกิจกรรม
    # เช่น [{"title": "เตรียมเอกสาร", "done": false}, {"title": "ส่งอีเมล", "done": true}]
    subtasks = Column(JSONB, nullable=True)
    
    # Repeat config: เก็บไว้เพื่อความเข้ากันได้ย้อนหลัง (ไม่ได้ใช้งานใน logic ใหม่)
    # Logic ใหม่ใช้ RoutineActivity แทน
    repeat_config = Column(JSONB, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())