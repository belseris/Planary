import uuid
from sqlalchemy import Column, String, Integer, Date, Time, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from db.session import Base

class Diary(Base):
    __tablename__ = "diaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    date = Column(Date, nullable=False)           
    time = Column(Time, nullable=False)           
    title = Column(String(200), nullable=False)
    detail = Column(String(2000), nullable=True)
    mood = Column(String(20), nullable=False)     
    tags = Column(String(255), nullable=True)     

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
