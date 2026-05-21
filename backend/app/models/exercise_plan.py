import uuid
from sqlalchemy import Column, String, Date, DateTime, Text, Float, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base

class ExercisePlan(Base):
    __tablename__ = "exercise_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    generated_date = Column(Date, nullable=False)
    ai_analysis = Column(Text)
    exercises = Column(JSON, nullable=False)
    risk_level = Column(String(20))
    setback_probability = Column(Float)
    valid_until = Column(Date)
    created_at = Column(DateTime, server_default=func.now())
