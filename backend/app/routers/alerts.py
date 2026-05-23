# alerts router — GET /api/alerts and PATCH /api/alerts/{id}/acknowledge
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.alert import Alert
from app.models.user import User
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/")
async def get_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all alerts — for doctor/caregiver roles."""
    try:
        result = await db.execute(
            select(Alert).order_by(Alert.sent_at.desc()).limit(50)
        )
        alerts = result.scalars().all()
        return alerts
    except Exception as e:
        logger.error(f"Error fetching alerts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark an alert as acknowledged."""
    try:
        result = await db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalars().first()

        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        alert.acknowledged = True
        await db.commit()
        await db.refresh(alert)
        return {"success": True, "message": "Alert acknowledged"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


from pydantic import BaseModel
from app.services.alert_service import send_email_alert, send_whatsapp_alert, format_email_alert, format_whatsapp_alert
from app.config import settings

class TriggerInput(BaseModel):
    alert_type: str
    message: str
    email: Optional[str] = None
    phone: Optional[str] = None

class RefineInput(BaseModel):
    symptoms: str

@router.post("/refine-ai")
async def refine_symptoms_ai(data: RefineInput):
    """Refine raw symptoms into a professional clinical description using OpenRouter."""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY
        )
        
        prompt = f"""You are an advanced clinical rehabilitation AI. 
A patient has described their symptoms/illness: "{data.symptoms}"

Convert this patient description into a highly professional, concise, structured clinical alert summary (max 3 sentences) suitable to send to a doctor. 
Write in a calm, objective medical tone. Do not use conversational preambles. Return ONLY the refined clinical text.
"""
        response = await client.chat.completions.create(
            model="openrouter/free",
            messages=[{"role": "user", "content": prompt}]
        )
        return {"refined_message": response.choices[0].message.content.strip()}
    except Exception as e:
        logger.error(f"Error in refine_symptoms_ai: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trigger-critical")
async def trigger_critical_alert(
    data: TriggerInput,
    current_user: User = Depends(get_current_user)
):
    """Real time trigger for email and WhatsApp alerts during manual testing."""
    try:
        # Build structured messages
        email_body = format_email_alert(
            alert_type=data.alert_type,
            patient_name=current_user.full_name,
            patient_id=f"PT-{str(current_user.id)[:8].upper()}",
            detail=data.message,
            action="Review patient data immediately."
        )
        whatsapp_body = format_whatsapp_alert(
            alert_type=data.alert_type,
            patient_name=current_user.full_name,
            patient_id=f"PT-{str(current_user.id)[:8].upper()}",
            detail=data.message,
            action="Review patient data immediately."
        )

        # 1. Send Email Alert
        target_email = data.email if data.email else "Fizanaazz321@gmail.com"
        email_ok = await send_email_alert(
            to_email=target_email,
            subject=f"RehabAI Alert: {data.alert_type}",
            body=email_body
        )

        # 2. Send WhatsApp Alert
        target_phone = data.phone if data.phone else "923123632197"
        whatsapp_ok = await send_whatsapp_alert(
            phone_number=target_phone,
            message=whatsapp_body
        )

        return {
            "success": True,
            "email_sent": email_ok,
            "whatsapp_sent": whatsapp_ok
        }
    except Exception as e:
        logger.error(f"Error in trigger_critical_alert: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
