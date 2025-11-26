"""
session.py - การเชื่อมต่อฐานข้อมูล (Database Connection & Session)

หน้าที่หลัก:
- สร้าง SQLAlchemy engine เพื่อเชื่อมต่อกับ PostgreSQL
- สร้าง SessionLocal สำหรับจัดการ database transactions
- สร้าง Base class สำหรับ define models
- มี get_db() dependency สำหรับใช้ใน FastAPI routers

การทำงาน:
- engine: เชื่อมต่อ database ด้วย connection string จาก settings.database_url
- SessionLocal: factory สำหรับสร้าง database session ใหม่ทุกครั้งที่มี request
- Base: parent class ที่ models ทั้งหมดจะ inherit จาก
- get_db(): generator ที่ FastAPI ใช้เพื่อ inject database session เข้าไปใน router functions
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings
import os

# สร้าง folder avatars ถ้ายังไม่มี (สำหรับเก็บรูปโปรไฟล์)
os.makedirs(settings.avatars_dir, exist_ok=True)

# สร้าง engine เพื่อเชื่อมต่อกับ PostgreSQL
# pool_pre_ping=True: เช็คว่า connection ยังใช้งานได้ก่อนใช้งานจริง
engine = create_engine(settings.database_url, pool_pre_ping=True)

# สร้าง SessionLocal factory สำหรับสร้าง database session
# autocommit=False: ต้อง commit transaction เอง
# autoflush=False: ไม่ flush โดยอัตโนมัติ
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class สำหรับ SQLAlchemy models (User, Diary, Activity, etc.)
Base = declarative_base()

def get_db():
    """
    Dependency function สำหรับ FastAPI routers
    
    Yields:
        Session: database session สำหรับ query/insert/update/delete
    
    การใช้งานใน router:
        @router.get("/...")
        def some_endpoint(db: Session = Depends(get_db)):
            # ใช้ db ได้เลย
            pass
    
    FastAPI จะเรียก get_db() ทุกครั้งที่มี request มา
    และจะปิด session อัตโนมัติหลัง request เสร็จ (ใน finally block)
    """
    db = SessionLocal()  # สร้าง session ใหม่
    try:
        yield db  # ส่ง session ไปให้ router function ใช้
    finally:
        db.close()  # ปิด session หลังใช้งานเสร็จ
