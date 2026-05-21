from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID

class ExerciseDetail(BaseModel):
    name: str
    description: str
    duration_minutes: int
    repetitions: Optional[int] = None
    sets: Optional[int] = None
    difficulty: str
    target_area: str
    precautions: Optional[str] = None

class ExercisePlanAIResponse(BaseModel):
    analysis: str
    risk_level: str
    exercises: List[ExerciseDetail]
    dietary_note: Optional[str] = None
    rest_recommendation: Optional[str] = None

class ExercisePlanResponse(BaseModel):
    id: UUID
    patient_id: UUID
    generated_date: date
    ai_analysis: str
    exercises: List[dict]
    risk_level: str
    setback_probability: Optional[float] = None
    valid_until: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True
