from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from models.activity import Activity
from models.user import User
from db.session import get_db
from routers.profile import current_user
from schemas.activities import ActivityCreate, ActivityUpdate, ActivityOut, ActivityList
import datetime

router = APIRouter(prefix="/activities", tags=["activities"])

@router.post("", response_model=ActivityOut, status_code=201)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = Activity(user_id=me.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.get("", response_model=ActivityList)
def list_activities(
    qdate: str | None = Query(None),
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    q = db.query(Activity).filter(Activity.user_id == me.id)
    rows = q.order_by(Activity.date.desc(), Activity.time).all()

    # --- ตรวจสอบ repeat_config ---
    if qdate:
        try:
            d = datetime.date.fromisoformat(qdate)
        except:
            raise HTTPException(400, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)")

        weekday_key = ["mon","tue","wed","thu","fri","sat","sun"][d.weekday()]

        expanded = []
        for r in rows:
            if str(r.date) == qdate:
                expanded.append(r)
            elif r.repeat_config and r.repeat_config.get(weekday_key):
                # clone activity ให้แสดงในวันนั้นด้วย
                r_copy = ActivityOut.model_validate(r)
                r_copy.date = d
                expanded.append(r_copy)
        return ActivityList(items=expanded)

    return ActivityList(items=rows)

@router.get("/{activity_id}", response_model=ActivityOut)
def get_activity(activity_id: str, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == me.id).first()
    if not row:
        raise HTTPException(404, "ไม่พบกิจกรรม")
    return row

@router.put("/{activity_id}", response_model=ActivityOut)
def update_activity(activity_id: str, payload: ActivityUpdate, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == me.id).first()
    if not row:
        raise HTTPException(404, "ไม่พบกิจกรรม")
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: str, db: Session = Depends(get_db), me: User = Depends(current_user)):
    row = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == me.id).first()
    if not row:
        raise HTTPException(404, "ไม่พบกิจกรรม")
    db.delete(row)
    db.commit()
    return
