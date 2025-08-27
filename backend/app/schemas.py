# app/schemas.py
from datetime import date
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel

TimePeriod = Literal["MORNING", "AFTERNOON", "NIGHT"]

class GoogleCredential(BaseModel):
    credential: str

class HabitCreate(BaseModel):
    name: str
    period: TimePeriod
    local_time: Optional[str] = None

class HabitLogCreate(BaseModel):
    habit_id: UUID
    period: TimePeriod
    day: date
    completed: bool = True
    note: Optional[str] = None   # ✅ add this
