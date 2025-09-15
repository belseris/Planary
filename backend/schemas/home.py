from pydantic import BaseModel
from datetime import date, time
from uuid import UUID

class DiaryItem(BaseModel):
    id: UUID
    date: date
    time: time
    title: str
    detail: str | None = None
    mood: str
    tags: str | None = None

    class Config:
        from_attributes = True

class DiaryListResponse(BaseModel):
    items: list[DiaryItem]
    total: int
