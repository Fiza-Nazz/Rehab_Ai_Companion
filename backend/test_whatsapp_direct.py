import asyncio
import sys
import os

# Configure console encoding for Windows
sys.stdout.reconfigure(encoding='utf-8')

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.alert_service import send_whatsapp_alert

async def run_direct_test():
    print("=" * 60)
    print("TESTING HEADLESS WHATSAPP ALERT TRANSMISSION")
    print("=" * 60)
    
    phone = "923123632197"
    msg = "🚨 RehabAI CRITICAL ALERT 🚨\n\nPatient: Ahmed Khalid\nDetail: Headless real live transmission testing!\nAction: Please review immediately."
    
    print(f"Sending WhatsApp message to {phone}...")
    success = await send_whatsapp_alert(phone_number=phone, message=msg)
    
    print("\n" + "=" * 50)
    if success:
        print("SUCCESS: WhatsApp sent successfully in headless mode!")
    else:
        print("FAILED: WhatsApp sending failed! Please verify setup.")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(run_direct_test())
