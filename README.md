# AI Rehab Companion 🤖🏥

An advanced Agentic AI-powered rehabilitation platform designed specifically for prosthetics users. The AI Rehab Companion serves as a 24/7 virtual physiotherapist and medical monitor, combining real-time daily tracking, predictive machine learning, dynamic AI exercise generation, and automated emergency alerting to ensure a fast, safe, and smart recovery process.

## 🚀 Key Features

*   **🏥 Daily Health Tracking (Check-ins):** Patients log their daily metrics (pain, fatigue, mobility, and mood). The platform tracks these trends securely in a PostgreSQL/SQLite database.
*   **🤖 AI-Generated Exercise Plans:** Driven by advanced LLMs (Llama 3.3 / OpenRouter), the app generates hyper-personalized, safe daily exercise routines based on the patient's real-time physical condition, surgery type, and recent check-ins.
*   **📈 Future Setback Forecasting:** Utilizes Machine Learning (Facebook Prophet) to analyze historical pain data and predict potential setbacks up to 7 days in advance, allowing for preemptive care.
*   **🚨 Automated Smart Alerts:** A robust Celery background worker system integrates with Playwright and Gmail/SendGrid to automatically dispatch urgent alerts via WhatsApp and Email to doctors and caregivers if pain spikes or check-ins are missed.
*   **💬 24/7 AI Chatbot Support:** A compassionate, context-aware AI chatbot that provides immediate, safe advice regarding prosthetic care, pain management, and general recovery guidance.
*   **💎 Premium 3D UI:** Built with Next.js and Tailwind CSS, featuring a clean, futuristic, medical-grade interface with Framer Motion animations.

## 🛠️ Tech Stack

### Frontend
*   **Framework:** Next.js 14 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS & Framer Motion
*   **Charts:** Recharts
*   **State & Auth:** Zustand, NextAuth.js

### Backend
*   **Framework:** FastAPI (Python)
*   **AI Integration:** OpenRouter (Llama 3.3 70B), OpenAI SDK
*   **Machine Learning:** Prophet (Time-series forecasting)
*   **Database:** SQLAlchemy & Alembic
*   **Task Queue:** Celery & Redis
*   **Automation:** Playwright (WhatsApp Automations)

## 🏗️ Architecture

1.  **Frontend (Vercel):** Hosts the dynamic Next.js UI, communicating securely with the backend via Axios.
2.  **Backend (FastAPI):** Serves the API endpoints, handles JWT authentication, and streams AI responses.
3.  **Background Workers (Celery/Redis):** Independently processes Prophet ML forecasting and scheduled WhatsApp/Email alert dispatching.

## ⚙️ Getting Started

### Setup Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload

# Start Celery Worker (in a separate terminal)
celery -A celery_worker.celery_app worker --loglevel=info --pool=solo
```

### Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

---
*Developed by **Fiza Nazz** — Full Stack Developer & Agentic AI Engineer.*
