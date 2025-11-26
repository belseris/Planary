"""
config.py - การตั้งค่าแอปพลิเคชัน (Configuration)

หน้าที่หลัก:
- อ่านค่าตั้งค่าจากไฟล์ .env (environment variables)
- เก็บค่าคงที่ต่างๆ เช่น DATABASE_URL, SECRET_KEY, token expiration
- กำหนด path สำหรับเก็บไฟล์ media (รูปภาพ avatars)

ค่าที่ต้องตั้งใน .env:
- DATABASE_URL: connection string สำหรับ PostgreSQL
- SECRET_KEY: key สำหรับเข้ารหัส JWT tokens
- ACCESS_TOKEN_EXPIRE_MINUTES: ระยะเวลา token หมดอายุ (default 120 นาที = 2 ชั่วโมง)
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    env: str = Field("dev", alias="ENV")  # สภาพแวดล้อม (dev/prod)
    database_url: str = Field(..., alias="DATABASE_URL")  # URL สำหรับเชื่อมต่อ PostgreSQL
    secret_key: str = Field(..., alias="SECRET_KEY")  # Secret key สำหรับเข้ารหัส JWT
    access_token_expire_minutes: int = Field(120, alias="ACCESS_TOKEN_EXPIRE_MINUTES")  # Token หมดอายุใน 2 ชั่วโมง
    algorithm: str = "HS256"  # Algorithm สำหรับเข้ารหัส JWT
    media_dir: str = "media"  # Folder หลักสำหรับเก็บไฟล์ media
    avatars_dir: str = "media/avatars"  # Folder สำหรับเก็บรูป avatar ของ user

    # ตั้งค่าให้อ่านค่าจาก .env file
    model_config = SettingsConfigDict(
        env_file=".env",  # อ่านจากไฟล์ .env
        case_sensitive=False,  # ไม่สนใจตัวพิมพ์เล็ก-ใหญ่
        extra="ignore",  # เพิกเฉยค่าที่ไม่มีใน model
    )

# สร้าง instance ของ settings ให้ใช้งานทั่วแอป
settings = Settings()