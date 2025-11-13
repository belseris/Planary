from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID
import datetime

class RoutineActivityBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    category: Optional[str] = None
    time: Optional[datetime.time] = None

class RoutineActivityCreate(RoutineActivityBase):
    # Make day_of_week optional on the schema to be more forgiving to clients.
    # The router will set a sensible default if missing.
    day_of_week: Optional[str] = Field(None, example="mon")

class RoutineActivityUpdate(BaseModel):
    # ทำให้ทุก Field เป็น Optional สำหรับการอัปเดต
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = None
    time: Optional[datetime.time] = None

class RoutineActivityResponse(RoutineActivityBase):
    id: UUID
    day_of_week: str

    class Config:
        from_attributes = True