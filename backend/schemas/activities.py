from __future__ import annotations
from datetime import date, time as dt_time
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
import json
from typing import Optional # ✅ เพิ่ม

# ... (Mixin _JsonMixin ใช้ของเดิมได้) ...
class _JsonMixin:
    @staticmethod
    def _parse_json_maybe(v):
        if v is None: return None
        if isinstance(v, (dict, list)): return v
        if isinstance(v, str):
            v = v.strip()
            return None if not v else json.loads(v)
        return v

class ActivityCreate(BaseModel, _JsonMixin):
    date: date
    all_day: bool = False
    time: dt_time | None = None
    title: str = Field(..., min_length=1, max_length=200)
    category: str | None = None
    status: str = "normal"
    remind: bool = False
    remind_offset_min: int = 5
    notes: str | None = None
    subtasks: list[dict] | str | None = None
    
    # ❌ ลบ repeat_config ออก
    # repeat_config: dict | str | None = None 

    @field_validator("subtasks", mode="before") # ✅ เอา repeat_config ออกจาก validator
    @classmethod
    def _coerce_json(cls, v):
        return cls._parse_json_maybe(v)

class ActivityUpdate(BaseModel, _JsonMixin):
    # ✅ ทำให้ทุก Field เป็น Optional สำหรับการ Update
    date: Optional[date] = None
    all_day: Optional[bool] = None
    time: Optional[dt_time | None] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = None
    status: Optional[str] = None
    remind: Optional[bool] = None
    remind_offset_min: Optional[int] = None
    notes: Optional[str] = None
    subtasks: Optional[list[dict] | str | None] = None
    
    @field_validator("subtasks", mode="before")
    @classmethod
    def _coerce_json(cls, v):
        return cls._parse_json_maybe(v)

class ActivityOut(BaseModel):
    id: UUID
    date: date
    all_day: bool
    time: dt_time | None
    title: str
    category: str | None
    status: str
    remind: bool
    remind_offset_min: int
    notes: str | None
    subtasks: list[dict] | None = None
    
    # ✅ เพิ่ม routine_id เพื่อให้ Frontend รู้ว่ามาจากแม่แบบไหน
    routine_id: Optional[UUID] = None
    
    # ❌ ลบ repeat_config ออก
    # repeat_config: dict | None = None

    class Config:
        from_attributes = True

class ActivityList(BaseModel):
    items: list[ActivityOut]