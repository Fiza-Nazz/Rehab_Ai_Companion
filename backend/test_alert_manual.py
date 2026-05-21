# test_alert_manual.py — Manually trigger Celery tasks to test alerts
# Usage: .\venv\Scripts\python.exe test_alert_manual.py

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

async def test_email_alert():
    """Test sending an email alert via SendGrid."""
    from app.services.alert_service import send_email_alert
    print("[TEST] Sending test email alert...")
    result = await send_email_alert(
        to_email=input("Enter your email address to test: ").strip(),
        subject="[TEST] Rehab Companion Alert System",
        body="This is a test alert from the Rehab Companion backend. If you received this, SendGrid is working correctly!"
    )
    if result:
        print("[SUCCESS] Email sent successfully!")
    else:
        print("[FAILED] Email failed — check SENDGRID_API_KEY in .env")

async def test_whatsapp_alert():
    """Test sending a WhatsApp message via Playwright."""
    from app.services.alert_service import send_whatsapp_alert
    phone = input("Enter WhatsApp number with country code (e.g. 923001234567): ").strip()
    print(f"[TEST] Sending WhatsApp to +{phone}...")
    result = await send_whatsapp_alert(
        phone_number=phone,
        message="Test alert from Rehab Companion. If you see this, WhatsApp automation is working!"
    )
    if result:
        print("[SUCCESS] WhatsApp message sent!")
    else:
        print("[FAILED] WhatsApp failed — ensure you ran whatsapp_qr_setup.py first")

async def test_celery_task():
    """Manually trigger the daily alert check Celery task synchronously (without Redis)."""
    from app.tasks.celery_tasks import _run_daily_alert_check
    print("[TEST] Running daily_alert_check task directly (no Redis needed)...")
    await _run_daily_alert_check()
    print("[DONE] Task completed.")

if __name__ == "__main__":
    print("\n=== Rehab Companion — Alert Manual Test ===\n")
    print("1. Test Email Alert (SendGrid)")
    print("2. Test WhatsApp Alert (Playwright)")
    print("3. Run daily_alert_check task directly")
    choice = input("\nEnter choice (1/2/3): ").strip()

    if choice == "1":
        asyncio.run(test_email_alert())
    elif choice == "2":
        asyncio.run(test_whatsapp_alert())
    elif choice == "3":
        asyncio.run(test_celery_task())
    else:
        print("Invalid choice.")
