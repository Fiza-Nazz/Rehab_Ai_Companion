from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any
from datetime import date, timedelta
import logging

from app.database import get_db
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.checkin import DailyCheckIn
from app.routers.auth import get_current_user
from app.services.forecast_service import predict_setback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/progress", tags=["progress"])

async def get_patient_profile(db: AsyncSession, user_id):
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == user_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient

@router.get("/summary")
async def get_progress_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        start_date = date.today() - timedelta(days=7)
        
        result = await db.execute(
            select(DailyCheckIn)
            .where(DailyCheckIn.patient_id == patient.id)
            .where(DailyCheckIn.checkin_date >= start_date)
        )
        checkins = result.scalars().all()
        
        if not checkins:
            return {"avg_pain": 0, "avg_mobility": 0, "streak": 0}
            
        avg_pain = sum(c.pain_score for c in checkins) / len(checkins)
        avg_mobility = sum(c.mobility_score for c in checkins) / len(checkins)
        
        return {
            "avg_pain": round(avg_pain, 1),
            "avg_mobility": round(avg_mobility, 1),
            "streak": len(checkins)
        }
    except Exception as e:
        logger.error(f"Error in summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/forecast")
async def get_progress_forecast(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        start_date = date.today() - timedelta(days=60)
        
        result = await db.execute(
            select(DailyCheckIn)
            .where(DailyCheckIn.patient_id == patient.id)
            .where(DailyCheckIn.checkin_date >= start_date)
            .order_by(DailyCheckIn.checkin_date.asc())
        )
        checkins = result.scalars().all()
        
        if len(checkins) < 3:
            return {
                "setback_probability": 0.0,
                "max_predicted_pain": 0.0,
                "forecast_dates": []
            }
            
        checkin_history = [{"ds": c.checkin_date.strftime('%Y-%m-%d'), "y": c.pain_score} for c in checkins]
        forecast = predict_setback(checkin_history)
        return forecast
    except Exception as e:
        logger.error(f"Error in forecast: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/charts")
async def get_progress_charts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        start_date = date.today() - timedelta(days=14)
        
        result = await db.execute(
            select(DailyCheckIn)
            .where(DailyCheckIn.patient_id == patient.id)
            .where(DailyCheckIn.checkin_date >= start_date)
            .order_by(DailyCheckIn.checkin_date.asc())
        )
        checkins = result.scalars().all()
        
        chart_data = []
        for c in checkins:
            chart_data.append({
                "date": c.checkin_date.strftime('%b %d'),
                "pain": c.pain_score,
                "mobility": c.mobility_score,
                "fatigue": c.fatigue_score
            })
            
        return chart_data
    except Exception as e:
        logger.error(f"Error in charts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/adherence")
async def get_progress_adherence(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        patient = await get_patient_profile(db, current_user.id)
        start_date = date.today() - timedelta(days=28)
        
        result = await db.execute(
            select(DailyCheckIn)
            .where(DailyCheckIn.patient_id == patient.id)
            .where(DailyCheckIn.checkin_date >= start_date)
            .order_by(DailyCheckIn.checkin_date.asc())
        )
        checkins = result.scalars().all()
        
        adherence_data = [
            {"week": "Week 1", "completed": 0, "missed": 7},
            {"week": "Week 2", "completed": 0, "missed": 7},
            {"week": "Week 3", "completed": 0, "missed": 7},
            {"week": "Week 4 (now)", "completed": 0, "missed": 7},
        ]
        
        today = date.today()
        for c in checkins:
            days_ago = (today - c.checkin_date).days
            if days_ago <= 7:
                idx = 3
            elif days_ago <= 14:
                idx = 2
            elif days_ago <= 21:
                idx = 1
            else:
                idx = 0
            
            # Check if check-in exists and exercise is completed
            if c.exercise_completed:
                adherence_data[idx]["completed"] += 1
                adherence_data[idx]["missed"] -= 1
                
        # Make sure missed doesn't go below 0
        for data in adherence_data:
            data["missed"] = max(0, data["missed"])
            
        return adherence_data
    except Exception as e:
        logger.error(f"Error in adherence: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
