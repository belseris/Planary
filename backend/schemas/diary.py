from pydantic import BaseModel, Field
from datetime import date, time
from uuid import UUID

class DiaryCreate(BaseModel):
    date: date
    time: time
    title: str = Field(..., min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=2000)
    mood: str
    tags: str | None = None

class DiaryUpdate(BaseModel):
    date: date
    time: time
    title: str = Field(..., min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=2000)
    mood: str
    tags: str | None = None

class DiaryResponse(BaseModel):
    id: UUID
    date: date
    time: time
    title: str
    detail: str | None = None
    mood: str
    tags: str | None = None

    class Config:
        from_attributes = True
