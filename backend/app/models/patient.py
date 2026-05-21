import uuid
from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    prosthetic_type = Column(String(50))
    amputation_level = Column(String(50))
    surgery_date = Column(Date)
    pain_baseline = Column(Integer)
    assigned_doctor_id = Column(String(36), ForeignKey("users.id"))
    assigned_caregiver_id = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
