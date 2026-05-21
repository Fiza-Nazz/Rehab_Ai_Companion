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
from app.schemas.checkin import CheckInCreate, CheckInResponse
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/checkin", tags=["checkin"])

async def get_patient_profile(db: AsyncSession, user_id):
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == user_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient

@router.post("/", response_model=CheckInResponse)
async def submit_checkin(
    data: CheckInCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        today = date.today()
        
        # validate business logic
        result = await db.execute(
            select(DailyCheckIn)
            .where(DailyCheckIn.patient_id == patient.id)
            .where(DailyCheckIn.checkin_date == today)
        )
        existing = result.scalars().first()
        
        if existing:
            raise HTTPException(status_code=409, detail="Check-in already submitted for today")
        
        # perform operation
        checkin = DailyCheckIn(
            patient_id=patient.id,
            checkin_date=today,
            pain_score=data.pain_score,
            fatigue_score=data.fatigue_score,
            mobility_score=data.mobility_score,
            mood_score=data.mood_score,
            notes=data.notes
        )
        db.add(checkin)
        await db.commit()
        await db.refresh(checkin)
        
        # trigger background task
        # generate_exercise_plan.delay(str(current_user.id))
        
        return checkin
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in submit_checkin: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error. Please try again.")

@router.get("/today", response_model=bool)
async def check_today_checkin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        today = date.today()
        result = await db.execute(
            select(DailyCheckIn)
            .where(DailyCheckIn.patient_id == patient.id)
            .where(DailyCheckIn.checkin_date == today)
        )
        existing = result.scalars().first()
        return existing is not None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in check_today_checkin: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error. Please try again.")

@router.get("/history", response_model=List[CheckInResponse])
async def get_history_30_days(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_history_n_days(30, db, current_user)

@router.get("/history/{days}", response_model=List[CheckInResponse])
async def get_history_n_days(
    days: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        start_date = date.today() - timedelta(days=days)
        
        result = await db.execute(
            select(DailyCheckIn)
            .where(DailyCheckIn.patient_id == patient.id)
            .where(DailyCheckIn.checkin_date >= start_date)
            .order_by(DailyCheckIn.checkin_date.desc())
        )
        return result.scalars().all()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_history_n_days: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error. Please try again.")
