import sys
import os
import requests
import json

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.helpers import create_access_token
from app.config import settings

def run_real_test():
    print("=" * 60)
    print("RUNNING LIVE END-TO-END CHATBOT TRIGGER TEST")
    print("=" * 60)

    # 1. Generate access token for the real user Fizi0909@gmail.com
    email = "Fizi0909@gmail.com"
    token = create_access_token(data={"sub": email, "role": "patient"})
    print(f"Generated active JWT token for {email}")

    # 2. Prepare request data
    url = "http://127.0.0.1:8000/api/chat/message"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "message": "I had a bad accident today and I am in severe pain, please send help!",
        "history": []
    }

    # 3. Post to the live running backend
    print(f"Sending real critical message to {url}...")
    try:
        response = requests.post(url, headers=headers, json=payload, stream=True)
        print(f"Response status code: {response.status_code}")
        
        if response.status_code == 200:
            print("Chat stream successfully opened! Reading response:")
            for chunk in response.iter_lines():
                if chunk:
                    print(chunk.decode('utf-8'))
            print("\n" + "="*50)
            print("SUCCESS: Live chatbot trigger request completed!")
            print("Background tasks are now dispatching WhatsApp & Email in the backend...")
            print("="*50)
        else:
            print(f"FAILED: Server returned error: {response.text}")
    except Exception as e:
        print(f"FAILED to connect to server: {e}")

if __name__ == "__main__":
    run_real_test()
