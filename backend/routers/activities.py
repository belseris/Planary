"""
activities.py - API Endpoints สำหรับจัดการกิจกรรม (Activities)

หน้าที่หลัก:
- GET /activities?qdate=YYYY-MM-DD - ดึงกิจกรรมทั้งหมดในวันที่กำหนด
- POST /activities - สร้างกิจกรรมใหม่
- GET /activities/{id} - ดึงกิจกรรมตัวเดียว
- PUT /activities/{id} - แก้ไขกิจกรรม
- DELETE /activities/{id} - ลบกิจกรรม

คุณสมบัติพิเศษ - Auto-Instantiate Routines:
เมื่อเรียก GET /activities?qdate=... ระบบจะ:
1. ตรวจสอบว่าวันนั้นเป็นวันไหนในสัปดาห์ (mon, tue, wed, ...)
2. ดึง RoutineActivities ทั้งหมดของวันนั้น (แม่แบบกิจกรรมประจำ)
3. ตรวจสอบว่ากิจกรรมไหนยังไม่ถูกสร้างเป็น Activity จริงๆ
4. สร้าง Activity ใหม่จากแม่แบบที่ยังไม่มี (auto-instantiate)
5. ส่งรายการกิจกรรมทั้งหมดกลับไป (รวมของเก่า + ของที่เพิ่งสร้าง)

การเชื่อมโยง Routine:
- Activity.routine_id ชี้ไปที่ RoutineActivity.id
- แก้ไข/ลบ Activity จะไม่กระทบ RoutineActivity (แม่แบบ)
- วันพรุ่งนี้ระบบจะสร้าง Activity ใหม่จากแม่แบบอีกครั้ง
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from models.activity import Activity
from models.routine_activity import RoutineActivity # Import แม่แบบกิจกรรมประจำ
from models.user import User
from db.session import get_db
from routers.profile import current_user # Dependency สำหรับตรวจสอบ user ที่ login
from schemas.activities import ActivityCreate, ActivityUpdate, ActivityOut, ActivityList
import datetime
from uuid import UUID

router = APIRouter(prefix="/activities", tags=["Activities"])

@router.get("", response_model=ActivityList)
def list_activities(
    qdate: str = Query(..., description="Date in YYYY-MM-DD format"), # ✅ บังคับให้ส่ง qdate มา
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    """
    ดึงกิจกรรมทั้งหมดในวันที่กำหนด
    ระบบจะสร้างกิจกรรมจากแม่แบบ (Routine) ให้โดยอัตโนมัติ
    หากยังไม่มีกิจกรรมนั้นๆ ในวันดังกล่าว
    """
    try:
        target_date = datetime.date.fromisoformat(qdate)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # 1. หาวันของสัปดาห์ (e.g., "mon")
    day_key = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][target_date.weekday()]

    # 2. ดึง "แม่แบบ" ทั้งหมดของวันนั้น
    routine_templates = db.query(RoutineActivity).filter(
        RoutineActivity.user_id == me.id,
        RoutineActivity.day_of_week == day_key
    ).all()

    # 3. ดึง "กิจกรรมจริง" ที่มีอยู่แล้วของวันนั้น
    existing_activities = db.query(Activity).filter(
        Activity.user_id == me.id,
        Activity.date == target_date
    ).all()

    # 4. หาว่าแม่แบบไหนยังไม่ถูกสร้างเป็นกิจกรรมจริง
    existing_routine_ids = {str(act.routine_id) for act in existing_activities if act.routine_id}
    new_activities_to_create = []

    for template in routine_templates:
        if str(template.id) not in existing_routine_ids:
            # ✅ ถ้ายังไม่มี ให้สร้างกิจกรรมจริง (Instantiate)
            # คัดลอก subtasks แต่รีเซ็ต completed เป็น false และสร้าง ID ใหม่
            copied_subtasks = None
            if template.subtasks:
                import uuid
                copied_subtasks = [
                    {
                        "id": str(uuid.uuid4()),
                        "text": st.get("text", ""),
                        "completed": False
                    }
                    for st in template.subtasks
                ]
            
            new_activity = Activity(
                user_id=me.id,
                routine_id=template.id, # ลิงก์กลับไปที่แม่แบบ
                date=target_date,
                title=template.title,
                category=template.category,
                time=template.time,
                status="normal", # สถานะเริ่มต้น
                all_day=False,
                notes=template.notes, # คัดลอกรายละเอียดจากแม่แบบ
                subtasks=copied_subtasks, # คัดลอกงานย่อยจากแม่แบบ (รีเซ็ต completed)
            )
            new_activities_to_create.append(new_activity)

    # 5. บันทึกกิจกรรมใหม่ลง DB (ถ้ามี)
    if new_activities_to_create:
        db.add_all(new_activities_to_create)
        db.commit()
        # ดึงข้อมูลทั้งหมดอีกครั้งเพื่อรวมกิจกรรมที่เพิ่งสร้าง
        all_activities_for_day = db.query(Activity).filter(
            Activity.user_id == me.id,
            Activity.date == target_date
        ).order_by(Activity.time).all()
        return ActivityList(items=all_activities_for_day)

    # 6. ถ้าไม่มีอะไรใหม่ ก็ส่งของเดิมกลับไป
    existing_activities.sort(key=lambda x: x.time if x.time else datetime.time.max)
    return ActivityList(items=existing_activities)

# --- Endpoints อื่นๆ ---

@router.post("", response_model=ActivityOut, status_code=201)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db), me: User = Depends(current_user)):
    """
    สร้างกิจกรรมเฉพาะกิจ (ที่ไม่ใช่ Routine)
    """
    row = Activity(user_id=me.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.get("/{activity_id}", response_model=ActivityOut)
def get_activity(activity_id: UUID, db: Session = Depends(get_db), me: User = Depends(current_user)):
    """
    ดึงข้อมูลกิจกรรมเดี่ยว
    """
    row = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == me.id).first()
    if not row:
        raise HTTPException(404, "ไม่พบกิจกรรม")
    return row

@router.put("/{activity_id}", response_model=ActivityOut)
def update_activity(
    activity_id: UUID,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    """
    อัปเดตกิจกรรมเดี่ยว (เช่น เปลี่ยนสถานะ, แก้ไขโน้ต)
    """
    row = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == me.id).first()
    if not row:
        raise HTTPException(404, "ไม่พบกิจกรรม")
    
    # If client mistakenly sends `date` in update payload, ignore it here
    if isinstance(payload, dict) and 'date' in payload:
        payload.pop('date')

    # Validate remaining fields with ActivityUpdate schema
    try:
        validated = ActivityUpdate.model_validate(payload)
    except Exception as e:
        # Re-raise as HTTP 422 with validation details
        raise HTTPException(status_code=422, detail=str(e))

    update_data = validated.model_dump(exclude_unset=True)
    
    # ถ้าอัปเดตสถานะของกิจกรรมที่มาจาก Routine
    # มันจะอัปเดตแค่ "กิจกรรมจริง" ของวันนี้ ไม่กระทบ "แม่แบบ"
    
    for k, v in update_data.items():
        setattr(row, k, v)
        
    db.commit()
    db.refresh(row)
    return row

@router.delete("/{activity_id}", status_code=204)
def delete_activity(
    activity_id: UUID, 
    db: Session = Depends(get_db), 
    me: User = Depends(current_user)
):
    """
    ลบกิจกรรมเดี่ยว
    (ถ้าลบกิจกรรมที่มาจาก Routine ก็จะหายไปแค่วันนี้ วันพรุ่งนี้ระบบจะสร้างให้ใหม่)
    """
    row = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == me.id).first()
    if not row:
        raise HTTPException(404, "ไม่พบกิจกรรม")
    db.delete(row)
    db.commit()
    return