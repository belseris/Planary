import uuid
from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=False)
    gender = Column(String(10), nullable=False)     # "ชาย"/"หญิง"
    age = Column(Integer, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(512), nullable=True)  # path เส้นทางรูป
