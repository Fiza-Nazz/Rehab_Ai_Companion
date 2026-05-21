import logging
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException

from app.models.patient import PatientProfile
from app.models.checkin import DailyCheckIn
from app.models.exercise_plan import ExercisePlan
from app.services.ai_service import generate_exercise_plan_ai
from app.services.forecast_service import predict_setback

logger = logging.getLogger(__name__)

async def generate_and_save_exercise_plan(db: AsyncSession, patient: PatientProfile) -> ExercisePlan:
    """Generate a new exercise plan for a patient and save it to the DB."""
    # Get last 14 days of checkins
    result = await db.execute(
        select(DailyCheckIn)
        .where(DailyCheckIn.patient_id == patient.id)
        .order_by(DailyCheckIn.checkin_date.desc())
        .limit(14)
    )
    checkins = result.scalars().all()
    
    checkin_data = [
        {
            "date": str(c.checkin_date),
            "pain": c.pain_score,
            "fatigue": c.fatigue_score,
            "mobility": c.mobility_score,
            "mood": c.mood_score
        } for c in checkins
    ]
    
    patient_data = {
        "prosthetic_type": patient.prosthetic_type,
        "amputation_level": patient.amputation_level,
        "surgery_date": str(patient.surgery_date) if patient.surgery_date else None,
        "pain_baseline": patient.pain_baseline
    }
    
    # Get real setback probability from Prophet forecast using last 60 days
    forecast_start = date.today() - timedelta(days=60)
    forecast_result = await db.execute(
        select(DailyCheckIn)
        .where(DailyCheckIn.patient_id == patient.id)
        .where(DailyCheckIn.checkin_date >= forecast_start)
        .order_by(DailyCheckIn.checkin_date.asc())
    )
    forecast_checkins = forecast_result.scalars().all()
    checkin_history_60d = [
        {"ds": c.checkin_date.strftime('%Y-%m-%d'), "y": c.pain_score}
        for c in forecast_checkins
    ]
    try:
        forecast_data = predict_setback(checkin_history_60d)
        setback_probability = forecast_data["setback_probability"]
    except Exception as fe:
        logger.warning(f"Prophet forecast failed, defaulting to 0.0: {fe}")
        setback_probability = 0.0

    # Call Gemini AI with real setback probability
    ai_response = generate_exercise_plan_ai(checkin_data, patient_data, setback_probability)
    
    # Store in DB
    plan = ExercisePlan(
        patient_id=patient.id,
        generated_date=date.today(),
        ai_analysis=ai_response.get("analysis", ""),
        exercises=ai_response.get("exercises", []),
        risk_level=ai_response.get("risk_level", "unknown"),
        setback_probability=setback_probability
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    
    return plan
