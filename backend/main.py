"""
main.py - จุดเริ่มต้นของ Backend API (FastAPI Application)

หน้าที่หลัก:
- สร้าง FastAPI app instance และตั้งค่า CORS
- สร้างตาราง database ทั้งหมดจาก models
- เชื่อมต่อ routers ทั้งหมด (login, register, profile, diary, activities, routines)
- Mount folder media สำหรับเก็บไฟล์รูปภาพ
- จัดการ error handler สำหรับ validation errors (422)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from db.session import Base, engine
from routers.login import router as login_router
from routers.register import router as register_router
from routers.profile import router as profile_router
from routers.home import router as home_router
from routers.diary import router as diary_router
from routers.activities import router as activities_router
from core.config import settings
from routers.routine_activities import router as routine_activities_router
from routers.trends import router as trends_router
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

import models.user

# สร้าง FastAPI application instance
app = FastAPI(title="Planary API")

# สร้างตาราง database ทั้งหมดตาม models ที่ import มา (ถ้ายังไม่มี)
Base.metadata.create_all(bind=engine)

# Mount folder media (/media/avatars/) เพื่อให้เข้าถึงไฟล์รูปภาพผ่าน URL
# เช่น http://localhost:8000/media/avatars/filename.jpg
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

# ตั้งค่า CORS เพื่อให้ frontend (mobile app) สามารถเรียก API ได้
# สำหรับ development ใช้ allow_origins=["*"] เพื่อรับ request จากทุก origin
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],  # อนุญาตทุก origin (ควรจำกัดใน production)
	allow_credentials=True,  # อนุญาตให้ส่ง cookies/authorization headers
	allow_methods=["*"],  # อนุญาตทุก HTTP method (GET, POST, PUT, DELETE)
	allow_headers=["*"],  # อนุญาตทุก headers
)


# Endpoint ทดสอบว่า server ทำงานหรือไม่
@app.get("/ping")
def ping():
	return {"ping": "pong"}

# เชื่อมต่อ routers ทั้งหมดเข้ากับ app
# แต่ละ router จัดการ endpoints ที่เกี่ยวข้อง
app.include_router(register_router)  # POST /register - สมัครสมาชิก
app.include_router(login_router)  # POST /login - เข้าสู่ระบบ
app.include_router(profile_router)  # GET/PUT /profile - ดู/แก้ไขโปรไฟล์
app.include_router(home_router)  # GET /home - หน้าหลัก
app.include_router(diary_router)  # GET/POST/PUT/DELETE /diary - จัดการไดอารี่
app.include_router(activities_router)  # GET/POST/PUT/DELETE /activities - จัดการกิจกรรม
app.include_router(routine_activities_router)  # GET/POST/PUT/DELETE /routine-activities - จัดการกิจกรรมประจำ
app.include_router(trends_router)  # GET /trends/* - สำหรับหน้า Dashboard/Trends   


# Custom error handler สำหรับ validation errors (422 Unprocessable Entity)
# ใช้ในการ debug เมื่อ request body ไม่ตรงกับ schema ที่กำหนด
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
	# Print รายละเอียด validation error ออกมาใน console เพื่อช่วย debug
	# ไม่ await request.json() เพราะอาจทำให้เกิด CancelledError ตอน shutdown
	body_preview = '<body not read>'
	try:
		# พยายามอ่าน raw body จาก request.scope ถ้ามี
		if hasattr(request, 'scope') and 'body' in request.scope:
			body_preview = request.scope.get('body')
	except Exception:
		body_preview = '<unable to read body>'
	
	# แสดงข้อมูล error ใน console
	print('\n=== Request validation error ===')
	try:
		print('Request:', request.method, request.url)  # เช่น POST /diary
	except Exception:
		print('Request: <unavailable>')
	print('Errors:', exc.errors())  # รายละเอียด field ไหนผิด
	print('Body preview:', body_preview)  # ข้อมูลที่ส่งมา
	print('================================\n')
	
	# ส่ง response กลับไปพร้อม error details
	return JSONResponse(status_code=422, content={"detail": exc.errors()})
