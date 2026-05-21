# Alert model — stores all alerts sent to doctors/caregivers
import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), nullable=False)
    alert_type = Column(String(50), nullable=False)  # 'pain_spike' | 'missed_checkin' | 'high_risk' | 'rapid_deterioration'
    message = Column(Text, nullable=False)
    sent_to = Column(String(255), nullable=False)    # phone number or email
    channel = Column(String(20), nullable=False)     # 'email' | 'whatsapp'
    sent_at = Column(DateTime, server_default=func.now())
    acknowledged = Column(Boolean, default=False)
