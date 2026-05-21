# celery_tasks.py — Background Celery tasks for daily alert checks
import asyncio
import logging
from celery import Celery
from celery.schedules import crontab
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize Celery app with Redis as broker and backend
celery_app = Celery(
    "rehab_companion",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.timezone = "UTC"

# ─────────────────────────────────────────────────────────────────────────────
# Celery Beat Schedule — runs automatically every day
# ─────────────────────────────────────────────────────────────────────────────
celery_app.conf.beat_schedule = {
    "daily-alert-check": {
        "task": "app.tasks.celery_tasks.daily_alert_check",
        "schedule": crontab(hour=9, minute=0),  # 9:00 AM UTC daily
    },
    "daily-forecast-update": {
        "task": "app.tasks.celery_tasks.daily_forecast_update",
        "schedule": crontab(hour=8, minute=0),  # 8:00 AM UTC daily
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Task: daily_alert_check
# Runs at 9:00 AM — checks all patients for alert conditions and fires them
# ─────────────────────────────────────────────────────────────────────────────
@celery_app.task(name="app.tasks.celery_tasks.daily_alert_check")
def daily_alert_check():
    """Check all patients daily and send alerts for pain spikes, missed check-ins, etc."""
    asyncio.run(_run_daily_alert_check())


async def _run_daily_alert_check():
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.future import select
    from datetime import date, timedelta
    from app.models.patient import PatientProfile
    from app.models.checkin import DailyCheckIn
    from app.models.alert import Alert
    from app.models.user import User
    from app.services.alert_service import send_alert

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        try:
            # Get all patient profiles
            result = await db.execute(select(PatientProfile))
            patients = result.scalars().all()

            today = date.today()
            two_days_ago = today - timedelta(days=2)
            week_ago = today - timedelta(days=7)

            for patient in patients:
                # --- Get assigned doctor/caregiver info ---
                doctor_result = await db.execute(select(User).where(User.id == patient.assigned_doctor_id))
                doctor = doctor_result.scalars().first()

                caregiver_result = await db.execute(select(User).where(User.id == patient.assigned_caregiver_id))
                caregiver = caregiver_result.scalars().first()

                # --- Get today's check-in ---
                checkin_result = await db.execute(
                    select(DailyCheckIn)
                    .where(DailyCheckIn.patient_id == patient.id)
                    .where(DailyCheckIn.checkin_date == today)
                )
                todays_checkin = checkin_result.scalars().first()

                # --- Alert 1: pain_spike — Pain > 7 on today's check-in ---
                if todays_checkin and todays_checkin.pain_score > 7:
                    message = (
                        f"ALERT: Patient pain score is {todays_checkin.pain_score}/10 today. "
                        f"Immediate attention may be required."
                    )
                    if doctor:
                        await send_alert("email", doctor.email, "Pain Spike Alert", message)
                        if doctor.phone:
                            await send_alert("whatsapp", doctor.phone, "Pain Spike Alert", message)
                    if caregiver:
                        await send_alert("email", caregiver.email, "Pain Spike Alert", message)

                    db.add(Alert(
                        patient_id=patient.id, alert_type="pain_spike",
                        message=message, sent_to=doctor.email if doctor else "unknown",
                        channel="email"
                    ))

                # --- Alert 2: missed_checkin — No check-in for 2 consecutive days ---
                recent_result = await db.execute(
                    select(DailyCheckIn)
                    .where(DailyCheckIn.patient_id == patient.id)
                    .where(DailyCheckIn.checkin_date >= two_days_ago)
                )
                recent_checkins = recent_result.scalars().all()

                if len(recent_checkins) == 0:
                    message = f"ALERT: Patient has not submitted a check-in for 2+ consecutive days."
                    if caregiver:
                        await send_alert("email", caregiver.email, "Missed Check-in Alert", message)
                    db.add(Alert(
                        patient_id=patient.id, alert_type="missed_checkin",
                        message=message, sent_to=caregiver.email if caregiver else "unknown",
                        channel="email"
                    ))

                # --- Alert 3: rapid_deterioration — Pain increased 3+ points vs last week avg ---
                if todays_checkin:
                    week_result = await db.execute(
                        select(DailyCheckIn)
                        .where(DailyCheckIn.patient_id == patient.id)
                        .where(DailyCheckIn.checkin_date >= week_ago)
                        .where(DailyCheckIn.checkin_date < today)
                    )
                    week_checkins = week_result.scalars().all()

                    if week_checkins:
                        avg_pain_last_week = sum(c.pain_score for c in week_checkins) / len(week_checkins)
                        if todays_checkin.pain_score >= avg_pain_last_week + 3:
                            message = (
                                f"ALERT: Rapid deterioration detected. "
                                f"Today's pain: {todays_checkin.pain_score}/10 vs "
                                f"last week avg: {round(avg_pain_last_week, 1)}/10."
                            )
                            if doctor:
                                await send_alert("email", doctor.email, "Rapid Deterioration Alert", message)
                                if doctor.phone:
                                    await send_alert("whatsapp", doctor.phone, "Rapid Deterioration Alert", message)
                            db.add(Alert(
                                patient_id=patient.id, alert_type="rapid_deterioration",
                                message=message, sent_to=doctor.email if doctor else "unknown",
                                channel="email"
                            ))

            await db.commit()
            logger.info("daily_alert_check completed successfully.")

        except Exception as e:
            logger.error(f"Error in daily_alert_check: {e}", exc_info=True)
            await db.rollback()

    await engine.dispose()


# ─────────────────────────────────────────────────────────────────────────────
# Task: daily_forecast_update
# Runs at 8:00 AM — updates setback probability for each patient using Prophet
# ─────────────────────────────────────────────────────────────────────────────
@celery_app.task(name="app.tasks.celery_tasks.daily_forecast_update")
def daily_forecast_update():
    """Run Prophet forecast for all patients and check high_risk probability."""
    asyncio.run(_run_daily_forecast_update())


async def _run_daily_forecast_update():
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.future import select
    from datetime import date, timedelta
    from app.models.patient import PatientProfile
    from app.models.checkin import DailyCheckIn
    from app.models.alert import Alert
    from app.models.user import User
    from app.services.forecast_service import predict_setback
    from app.services.alert_service import send_alert

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        try:
            result = await db.execute(select(PatientProfile))
            patients = result.scalars().all()

            sixty_days_ago = date.today() - timedelta(days=60)

            for patient in patients:
                history_result = await db.execute(
                    select(DailyCheckIn)
                    .where(DailyCheckIn.patient_id == patient.id)
                    .where(DailyCheckIn.checkin_date >= sixty_days_ago)
                    .order_by(DailyCheckIn.checkin_date.asc())
                )
                checkins = history_result.scalars().all()

                if len(checkins) < 3:
                    continue

                checkin_history = [{"ds": c.checkin_date.strftime('%Y-%m-%d'), "y": c.pain_score} for c in checkins]
                forecast = predict_setback(checkin_history)

                # Alert if setback_probability > 0.75
                if forecast["setback_probability"] > 0.75:
                    doctor_result = await db.execute(select(User).where(User.id == patient.assigned_doctor_id))
                    doctor = doctor_result.scalars().first()

                    message = (
                        f"HIGH RISK ALERT: Patient's AI-predicted setback probability is "
                        f"{forecast['setback_probability'] * 100:.0f}%. "
                        f"Predicted max pain: {forecast['max_predicted_pain']}/10. "
                        f"Please review patient's plan."
                    )
                    if doctor:
                        await send_alert("email", doctor.email, "High Risk Setback Alert", message)
                    db.add(Alert(
                        patient_id=patient.id, alert_type="high_risk",
                        message=message, sent_to=doctor.email if doctor else "unknown",
                        channel="email"
                    ))

            await db.commit()
            logger.info("daily_forecast_update completed successfully.")

        except Exception as e:
            logger.error(f"Error in daily_forecast_update: {e}", exc_info=True)
            await db.rollback()

    await engine.dispose()
