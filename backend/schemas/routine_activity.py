from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID
import datetime

class RoutineActivityBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    category: Optional[str] = None
    time: Optional[datetime.time] = None
    notes: Optional[str] = Field(None, max_length=2000)
    subtasks: Optional[List[Dict[str, Any]]] = None
    priority: Optional[str] = Field(None, example="medium")  # "low", "medium", "high"
    reminder_minutes: Optional[int] = Field(None, example=15)  # นาทีที่แจ้งเตือน
    remind_sound: Optional[bool] = True
    notification_id: Optional[str] = None

class RoutineActivityCreate(RoutineActivityBase):
    # Make day_of_week optional on the schema to be more forgiving to clients.
    # The router will set a sensible default if missing.
    day_of_week: Optional[str] = Field(None, example="mon")

class RoutineActivityUpdate(BaseModel):
    # ทำให้ทุก Field เป็น Optional สำหรับการอัปเดต
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = None
    time: Optional[datetime.time] = None
    notes: Optional[str] = Field(None, max_length=2000)
    subtasks: Optional[List[Dict[str, Any]]] = None
    priority: Optional[str] = None
    reminder_minutes: Optional[int] = None
    remind_sound: Optional[bool] = None
    notification_id: Optional[str] = None

class RoutineActivityResponse(RoutineActivityBase):
    id: UUID
    day_of_week: str

    class Config:
        from_attributes = True