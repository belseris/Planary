from pydantic import BaseModel, Field
import datetime
from uuid import UUID
from typing import List

class ActivityFeedback(BaseModel):
    id: str
    category: str
    title: str
    rating: int
    activityMood: str

class DiaryCreate(BaseModel):
    date: datetime.date
    time: datetime.time
    title: str = Field(..., min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=2000)
    mood: str | None = None
    mood_score: str | None = None  # 'good' | 'bad'
    mood_tags: List[str] | None = None  # ['😊', '🚀', ...]
    tags: str | None = None
    activities: List[ActivityFeedback] | None = None

class DiaryUpdate(BaseModel):
    date: datetime.date
    time: datetime.time
    title: str = Field(..., min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=2000)
    mood: str | None = None
    mood_score: str | None = None  # 'good' | 'bad'
    mood_tags: List[str] | None = None  # ['😊', '🚀', ...]
    tags: str | None = None
    activities: List[ActivityFeedback] | None = None

class DiaryResponse(BaseModel):
    id: UUID
    date: datetime.date
    time: datetime.time
    title: str
    detail: str | None = None
    mood: str | None = None
    mood_score: str | None = None
    mood_tags: List[str] | None = None
    tags: str | None = None
    activities: List[ActivityFeedback] | None = None

    class Config:
        from_attributes = True
