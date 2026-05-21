import uuid
from sqlalchemy import Column, String, Integer, Date, DateTime, Text, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base

class DailyCheckIn(Base):
    __tablename__ = "daily_checkins"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    checkin_date = Column(Date, nullable=False)
    pain_score = Column(Integer, nullable=False)
    fatigue_score = Column(Integer, nullable=False)
    mobility_score = Column(Integer, nullable=False)
    mood_score = Column(Integer, nullable=False)
    notes = Column(Text)
    exercise_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint('patient_id', 'checkin_date', name='uq_patient_checkin_date'),
    )
