import asyncio
import sys
import unittest
from unittest.mock import AsyncMock, patch

# Setup path
sys.path.insert(0, ".")

class TestChatbotDetection(unittest.IsolatedAsyncioTestCase):
    @patch("app.services.alert_service.send_email_alert", new_callable=AsyncMock)
    @patch("app.services.alert_service.send_whatsapp_alert", new_callable=AsyncMock)
    async def test_critical_trigger(self, mock_whatsapp, mock_email):
        # Import the router function and mock dependencies
        from app.routers.chat import send_chat_message, MessageInput
        from app.models.user import User
        from app.models.patient import PatientProfile
        from fastapi import BackgroundTasks
        
        # Mock database session
        mock_db = AsyncMock()
        
        # Mock patient profile
        patient = PatientProfile(id="test-patient-id", user_id="test-user-id")
        
        # Mock user
        current_user = User(id="test-user-id", full_name="Ahmed Khalid", phone="923123632197")
        
        # Mock get_patient function in chat.py
        with patch("app.routers.chat.get_patient", AsyncMock(return_value=patient)):
            # Test 1: Normal message (Should NOT trigger alerts)
            normal_data = MessageInput(message="Hello assistant, can you suggest some knee exercises?", history=[])
            
            with patch("app.routers.chat.client.models.generate_content_stream") as mock_stream:
                mock_stream.return_value = []
                mock_bg = BackgroundTasks()
                try:
                    await send_chat_message(normal_data, mock_bg, mock_db, current_user)
                    # Manually run the background tasks
                    for task in mock_bg.tasks:
                        await task()
                except Exception:
                    pass
                
                # Verify send_email_alert was NOT called
                mock_email.assert_not_called()
                mock_whatsapp.assert_not_called()
                print("SUCCESS: Normal message test passed: No alerts triggered.")

            # Test 2: Critical message (Should trigger alerts)
            critical_data = MessageInput(message="I had an accident and I am in severe pain!", history=[])
            
            with patch("app.routers.chat.client.models.generate_content_stream") as mock_stream:
                mock_stream.return_value = []
                mock_bg = BackgroundTasks()
                try:
                    await send_chat_message(critical_data, mock_bg, mock_db, current_user)
                    # Manually run the background tasks
                    for task in mock_bg.tasks:
                        await task()
                except Exception:
                    pass
                
                # Verify send_email_alert and send_whatsapp_alert were called
                mock_email.assert_called_once()
                mock_whatsapp.assert_called_once()
                
                # Verify targets
                email_args = mock_email.call_args[1]
                whatsapp_args = mock_whatsapp.call_args[1]
                
                self.assertEqual(email_args["to_email"], "Fizanaazz321@gmail.com")
                self.assertEqual(whatsapp_args["phone_number"], "923123632197")
                
                print("SUCCESS: Critical message test passed: Email and WhatsApp alerts triggered correctly!")

if __name__ == "__main__":
    unittest.main()
