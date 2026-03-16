"""
routine_activities.py - API Endpoints สำหรับจัดการแม่แบบกิจกรรมประจำ (Routine Activities)

หน้าที่หลัก:
- GET /routine-activities - ดึงรายการแม่แบบกิจกรรมทั้งหมด (filter ตามวันได้)
- POST /routine-activities - สร้างแม่แบบกิจกรรมใหม่
- PUT /routine-activities/{id} - แก้ไขแม่แบบกิจกรรม
- DELETE /routine-activities/{id} - ลบแม่แบบกิจกรรม

Routine Activity คืออะไร:
- เป็น "แม่แบบ" กิจกรรมที่ทำซ้ำทุกสัปดาห์
- ระบุวันในสัปดาห์ (mon, tue, wed, ...) และเวลา
- เช่น "ออกกำลังกาย" ทุกวันจันทร์ เวลา 06:00
- ระบบจะสร้าง Activity จริงๆ จากแม่แบบนี้อัตโนมัติใน activities router

ความสัมพันธ์กับ Activity:
- RoutineActivity = แม่แบบ (template)
- Activity = กิจกรรมจริงที่ instantiate จากแม่แบบ
- Activity.routine_id ชี้กลับมาที่ RoutineActivity.id
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.routine_activity import RoutineActivity
from models.activity import Activity
from models.user import User
from db.session import get_db
from routers.profile import current_user # Dependency สำหรับตรวจสอบ user ที่ login
from schemas.routine_activity import RoutineActivityCreate, RoutineActivityResponse, RoutineActivityUpdate
from datetime import datetime, date, timedelta
from uuid import UUID

router = APIRouter(prefix="/routine-activities", tags=["Routines"])

DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

def _parse_reminder_minutes(value) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None

def get_week_end(today: date) -> date:
    return today + timedelta(days=(6 - today.weekday()))

def get_date_for_day_in_week(today: date, day_key: str) -> date:
    target_weekday = DAY_KEYS.index(day_key)
    return today + timedelta(days=(target_weekday - today.weekday()))

def build_activity_from_routine(me: User, routine: RoutineActivity, target_date: date) -> Activity:
    copied_subtasks = None
    if routine.subtasks:
        import uuid
        copied_subtasks = [
            {
                "id": str(uuid.uuid4()),
                "text": st.get("text", ""),
                "completed": False
            }
            for st in routine.subtasks
        ]

    reminder_min = _parse_reminder_minutes(routine.reminder_minutes)
    remind_enabled = bool(routine.time) and reminder_min is not None and reminder_min > 0

    return Activity(
        user_id=me.id,
        routine_id=routine.id,
        date=target_date,
        title=routine.title,
        category=routine.category,
        time=routine.time,
        status="normal",
        all_day=False,
        notes=routine.notes,
        subtasks=copied_subtasks,
        remind=remind_enabled,
        remind_offset_min=reminder_min or 5,
        remind_type="simple",
        remind_sound=True if routine.remind_sound is None else bool(routine.remind_sound),
    )

@router.get("", response_model=list[RoutineActivityResponse])
def list_routines(
    day_of_week: str | None = None, 
    db: Session = Depends(get_db), 
    me: User = Depends(current_user)
):
    """
    ดึงข้อมูลแม่แบบกิจกรรมประจำวันทั้งหมด
    สามารถกรองด้วยวันในสัปดาห์ (e.g., "mon", "tue")
    """
    q = db.query(RoutineActivity).filter(RoutineActivity.user_id == me.id)
    if day_of_week:
        q = q.filter(RoutineActivity.day_of_week == day_of_week)
    return q.order_by(RoutineActivity.time).all()

@router.post("/batch-week", status_code=201)
def batch_week(
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    """
    สร้างกิจกรรมจากแม่แบบสำหรับ 7 วันถัดไป
    - ปกติ: สร้างตั้งแต่วันนี้จนถึงวันอาทิตย์
    - ถ้าวันนี้เป็นอาทิตย์: สร้างล่วงหน้าเป็นสัปดาห์ถัดไป
    """
    today = date.today()
    start_date = today + timedelta(days=1) if today.weekday() == 6 else today
    end_date = start_date + timedelta(days=6)

    routines = db.query(RoutineActivity).filter(RoutineActivity.user_id == me.id).all()
    new_rows = []

    for routine in routines:
        if routine.day_of_week not in DAY_KEYS:
            continue

        target_date = get_date_for_day_in_week(start_date, routine.day_of_week)
        if not (start_date <= target_date <= end_date):
            continue

        existing = db.query(Activity).filter(
            Activity.user_id == me.id,
            Activity.routine_id == routine.id,
            Activity.date == target_date
        ).first()

        if not existing:
            new_rows.append(build_activity_from_routine(me, routine, target_date))

    if new_rows:
        db.add_all(new_rows)
        db.commit()

    return {"created": len(new_rows)}

@router.post("", response_model=RoutineActivityResponse, status_code=201)
def create_routine(
    payload: RoutineActivityCreate, 
    db: Session = Depends(get_db), 
    me: User = Depends(current_user)
):
    """
    สร้างแม่แบบกิจกรรมประจำวันใหม่
    """
    data = payload.model_dump()
    # If client omitted day_of_week, default to today's day key to be forgiving
    if not data.get('day_of_week'):
        # Python datetime.weekday(): Monday=0..Sunday=6. We want Sunday=0 mapping.
        wk = datetime.now().weekday()
        data['day_of_week'] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][(wk + 1) % 7]

    row = RoutineActivity(user_id=me.id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)

    today = date.today()
    week_end = get_week_end(today)
    target_date = get_date_for_day_in_week(today, row.day_of_week)

    if today <= target_date <= week_end:
        existing = db.query(Activity).filter(
            Activity.user_id == me.id,
            Activity.routine_id == row.id,
            Activity.date == target_date
        ).first()

        if not existing:
            db.add(build_activity_from_routine(me, row, target_date))
            db.commit()
    return row

@router.put("/{routine_id}", response_model=RoutineActivityResponse)
def update_routine(
    routine_id: UUID, 
    payload: RoutineActivityUpdate, 
    db: Session = Depends(get_db), 
    me: User = Depends(current_user)
):
    """
    อัปเดตแม่แบบกิจกรรมประจำวัน
    """
    row = db.query(RoutineActivity).filter(
        RoutineActivity.id == routine_id, 
        RoutineActivity.user_id == me.id
    ).first()
    if not row:
        raise HTTPException(404, "ไม่พบกิจกรรมประจำวัน")
    
    update_data = payload.model_dump(exclude_unset=True) # อัปเดตเฉพาะ field ที่ส่งมา
    for k, v in update_data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)

    today = date.today()
    week_end = get_week_end(today)

    db.query(Activity).filter(
        Activity.user_id == me.id,
        Activity.routine_id == row.id,
        Activity.date >= today,
        Activity.date <= week_end,
    ).delete(synchronize_session=False)

    target_date = get_date_for_day_in_week(today, row.day_of_week)
    if today <= target_date <= week_end:
        db.add(build_activity_from_routine(me, row, target_date))

    db.commit()
    return row

@router.delete("/{routine_id}", status_code=204)
def delete_routine(
    routine_id: UUID, 
    db: Session = Depends(get_db), 
    me: User = Depends(current_user)
):
    """
    ลบแม่แบบกิจกรรมประจำวัน
    ก่อนลบจะตั้งค่า routine_id ของกิจกรรมที่เกี่ยวข้องเป็น NULL
    เพื่อให้กิจกรรมเหล่านั้นกลายเป็นกิจกรรมปกติ (ไม่ได้เชื่อมกับแม่แบบแล้ว)
    """
    from models.activity import Activity
    
    row = db.query(RoutineActivity).filter(
        RoutineActivity.id == routine_id, 
        RoutineActivity.user_id == me.id
    ).first()
    if not row:
        raise HTTPException(404, "ไม่พบกิจกรรมประจำวัน")
    
    # ตั้งค่า routine_id เป็น NULL สำหรับกิจกรรมที่สร้างจากแม่แบบนี้
    db.query(Activity).filter(
        Activity.routine_id == routine_id,
        Activity.user_id == me.id
    ).update({"routine_id": None}, synchronize_session=False)
    
    # ลบแม่แบบ
    db.delete(row)
    db.commit()
    return