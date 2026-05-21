from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class CheckInBase(BaseModel):
    pain_score: int = Field(..., ge=1, le=10)
    fatigue_score: int = Field(..., ge=1, le=10)
    mobility_score: int = Field(..., ge=1, le=10)
    mood_score: int = Field(..., ge=1, le=10)
    notes: Optional[str] = None

class CheckInCreate(CheckInBase):
    pass

class CheckInResponse(CheckInBase):
    id: UUID
    patient_id: UUID
    checkin_date: date
    exercise_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True
