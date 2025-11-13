import uuid
from sqlalchemy import Column, String, Time, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from db.session import Base

class RoutineActivity(Base):
    __tablename__ = "routine_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # วันในสัปดาห์ เช่น "mon", "tue"
    day_of_week = Column(String(10), nullable=False)
    
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    time = Column(Time, nullable=True)