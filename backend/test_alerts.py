"""Test script to verify email and WhatsApp sending works correctly."""
import asyncio
import sys
import os
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.services.alert_service import send_email_alert, send_whatsapp_alert, format_whatsapp_alert

async def test_all():
    print("=" * 50)
    print("TESTING EMAIL + WHATSAPP ALERT SYSTEM")
    print("=" * 50)

    # Build rich formatted WhatsApp message
    whatsapp_message = format_whatsapp_alert(
        alert_type="CRITICAL",
        patient_name="Ahmed Khalid",
        patient_id="PT-2024-0847",
        detail=(
            "Pain Score: 8/10 (Threshold: 6/10)\n"
            "Fatigue Level: 7/10\n"
            "Socket Fit: Poor\n"
            "Steps Today: 1,200 (Target: 3,000)\n"
            "AI Risk Level: HIGH setback probability"
        ),
        action=(
            "Please review patient immediately.\n"
            "Consider adjusting prosthetic socket.\n"
            "Recommend rest and pain management."
        )
    )

    from app.services.alert_service import format_email_alert

    # Build rich email body using the new HTML formatter
    email_body = format_email_alert(
        alert_type="CRITICAL",
        patient_name="Ahmed Khalid",
        patient_id="PT-2024-0847",
        detail=(
            "Pain Score: 8/10 (Threshold: 6/10)\n"
            "Fatigue Level: 7/10\n"
            "Socket Fit: Poor\n"
            "Steps Today: 1,200 (Target: 3,000)\n"
            "AI Risk Level: HIGH setback probability"
        ),
        action=(
            "Please review patient immediately.\n"
            "Consider adjusting prosthetic socket.\n"
            "Recommend rest and pain management."
        )
    )

    # 1. Test Email
    print("\n[1/2] Testing Gmail SMTP email...")
    print(f"  From: {settings.GMAIL_SENDER_EMAIL}")
    print(f"  To:   {settings.GMAIL_SENDER_EMAIL}")

    email_ok = await send_email_alert(
        to_email=settings.GMAIL_SENDER_EMAIL,
        subject="[RehabAI] CRITICAL ALERT - Ahmed Khalid | Pain Score 8/10",
        body=email_body
    )
    print(f"  Result: {'EMAIL SENT SUCCESSFULLY' if email_ok else 'EMAIL FAILED'}")

    # 2. Test WhatsApp
    print("\n[2/2] Testing WhatsApp via Playwright...")
    print(f"  Session folder: {settings.PLAYWRIGHT_USER_DATA_DIR}")
    print(f"  Message preview:\n{whatsapp_message[:100]}...")

    whatsapp_ok = await send_whatsapp_alert(
        phone_number="923123632197",
        message=whatsapp_message
    )
    print(f"  Result: {'WHATSAPP SENT SUCCESSFULLY' if whatsapp_ok else 'WHATSAPP FAILED'}")

    print("\n" + "=" * 50)
    print(f"SUMMARY: Email={'OK' if email_ok else 'FAILED'} | WhatsApp={'OK' if whatsapp_ok else 'FAILED'}")
    print("=" * 50)

asyncio.run(test_all())
