from __future__ import annotations
from datetime import date, time as dt_time
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
import json

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
    repeat_config: dict | str | None = None

    @field_validator("subtasks", "repeat_config", mode="before")
    @classmethod
    def _coerce_json(cls, v):
        return cls._parse_json_maybe(v)

class ActivityUpdate(ActivityCreate):
    pass

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
    repeat_config: dict | None = None

    class Config:
        from_attributes = True

class ActivityList(BaseModel):
    items: list[ActivityOut]
