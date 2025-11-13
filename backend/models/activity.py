import uuid
from sqlalchemy import JSON, Column, String, Boolean, Integer, Date, Time, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from db.session import Base

class Activity(Base):
    __tablename__ = "activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # ✅ [เพิ่มใหม่]
    # Field นี้ใช้เพื่ออ้างอิงว่ากิจกรรมนี้ถูกสร้างมาจาก "แม่แบบ" (Routine) ตัวไหน
    routine_id = Column(UUID(as_uuid=True), ForeignKey("routine_activities.id"), nullable=True)

    date = Column(Date, nullable=False)
    all_day = Column(Boolean, default=False)
    time = Column(Time, nullable=True)
    title = Column(String(200), nullable=False)
    category = Column(String(30), nullable=True)
    status = Column(String(12), default="normal")
    remind = Column(Boolean, default=False)
    remind_offset_min = Column(Integer, default=5)
    notes = Column(String(2000), nullable=True)
    subtasks = Column(JSONB, nullable=True)
    
    # Field นี้จะไม่ถูกใช้งานใน Logic ใหม่ แต่เก็บไว้ได้
    repeat_config = Column(JSONB, nullable=True) 

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())