import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, checkin, exercises, progress, alerts, chat
from app.database import engine, Base

app = FastAPI(
    title="Rehab Companion API",
    version="1.0.0"
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Enable CORS so the Next.js frontend can make requests to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(checkin.router)
app.include_router(exercises.router)
app.include_router(progress.router)
app.include_router(alerts.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {"message": "Rehab Companion API is running!"}







