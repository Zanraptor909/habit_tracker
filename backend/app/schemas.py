from pydantic import BaseModel
from typing import Optional
from datetime import date

class GoogleCredential(BaseModel):
    credential: str

class HabitCreate(BaseModel):
    name: str
    period: str              # 'MORNING' | 'AFTERNOON' | 'NIGHT' (or your enum)
    local_time: Optional[str] = None  # 'HH:MM' or None

class HabitLogCreate(BaseModel):
    habit_id: int
    period: str
    day: date
    completed: bool = True
