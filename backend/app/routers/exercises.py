from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from datetime import date, timedelta
import logging

from app.database import get_db
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.checkin import DailyCheckIn
from app.models.exercise_plan import ExercisePlan
from app.schemas.exercise import ExercisePlanResponse
from app.routers.auth import get_current_user
from app.services.exercise_service import generate_and_save_exercise_plan
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/exercises", tags=["exercises"])

async def get_patient_profile(db: AsyncSession, user_id):
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == user_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient

@router.post("/generate", response_model=ExercisePlanResponse)
async def generate_exercise_plan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        plan = await generate_and_save_exercise_plan(db, patient)
        return plan
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating exercise plan: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while generating plan.")

@router.get("/current", response_model=ExercisePlanResponse)
async def get_current_plan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        result = await db.execute(
            select(ExercisePlan)
            .where(ExercisePlan.patient_id == patient.id)
            .order_by(ExercisePlan.generated_date.desc(), ExercisePlan.created_at.desc())
        )
        plan = result.scalars().first()
        if not plan:
            raise HTTPException(status_code=404, detail="No active exercise plan found.")
        return plan
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching current plan: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error.")

@router.get("/history", response_model=List[ExercisePlanResponse])
async def get_history_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        result = await db.execute(
            select(ExercisePlan)
            .where(ExercisePlan.patient_id == patient.id)
            .order_by(ExercisePlan.generated_date.desc())
        )
        return result.scalars().all()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching plan history: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error.")
