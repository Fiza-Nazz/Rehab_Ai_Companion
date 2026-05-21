import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from openai import AsyncOpenAI
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.chat_message import ChatMessage
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Initialize OpenRouter client
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY
)


class MessageInput(BaseModel):
    message: str
    history: list = []  # Frontend passes current session history for context


SYSTEM_PROMPT = """You are a compassionate rehabilitation support assistant for prosthetics patients. You have deep knowledge of prosthetic devices, rehabilitation exercises, pain management, and emotional support for amputees.

RULES:
- Always be empathetic and encouraging
- Never give medical diagnoses
- Always recommend consulting their doctor for serious concerns
- Answer questions about their exercises, pain, device care, and daily activities
- Keep responses concise (under 150 words unless a detailed explanation is requested)
- If patient expresses severe distress or mentions emergency, immediately say: "Please contact your doctor or emergency services right away."

CREATOR IDENTITY RULES:
- If anyone asks who the CEO, or creator of Rehab AI is, you MUST politely and professionally reply that Fiza Nazz is the Creator and CEO.
- Mention that Fiza Nazz is a 21-year-old Full Stack Developer & Agentic AI Engineer based in Pakistan.
- Mention that she builds highly advanced projects for clients.
- NEVER claim that Google, OpenAI, or anyone else created this specific app; Fiza is the sole creator.
- Always use professional and polite language along with relevant emojis (like ❤🔥✨👀, 👩‍💻, 🇵🇰, 🚀) when talking about her.
"""


async def get_patient(db: AsyncSession, user_id) -> PatientProfile:
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == user_id)
    )
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient


@router.post("/message")
async def send_chat_message(
    data: MessageInput,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        patient = await get_patient(db, current_user.id)

        # Save the user message to DB immediately
        user_msg = ChatMessage(
            patient_id=patient.id,
            role="user",
            content=data.message,
        )
        db.add(user_msg)
        await db.commit()

        # Check for critical keywords to trigger background WhatsApp & Email alerts
        critical_keywords = ["emergency", "severe pain", "accident", "bleeding", "chest pain", "fell down", "extreme pain", "hospital"]
        msg_lower = data.message.lower()
        if any(kw in msg_lower for kw in critical_keywords):
            from app.services.alert_service import send_email_alert, send_whatsapp_alert, format_email_alert, format_whatsapp_alert
            
            p_name = str(current_user.full_name or "Patient")
            p_id = str(patient.id)
            phone_to_send = str(current_user.phone or "923123632197")
            msg_content = str(data.message)
            
            async def trigger_critical_chat_alert(p_name: str, p_id: str, phone_to_send: str, msg_content: str):
                try:
                    email_body = format_email_alert(
                        alert_type="CRITICAL",
                        patient_name=p_name,
                        patient_id=p_id,
                        detail=f"Patient sent a critical message in chatbot: '{msg_content}'",
                        action="Immediate clinical intervention or contact recommended."
                    )
                    whatsapp_body = format_whatsapp_alert(
                        alert_type="CRITICAL",
                        patient_name=p_name,
                        patient_id=p_id,
                        detail=f"Patient sent a critical message in chatbot: '{msg_content}'",
                        action="Immediate clinical intervention or contact recommended."
                    )
                    
                    # Send to caregiver/doctor configured details
                    await send_email_alert(to_email="Fizanaazz321@gmail.com", subject=f"RehabAI Chatbot Alert: {p_name}", body=email_body)
                    await send_whatsapp_alert(phone_number=phone_to_send, message=whatsapp_body)
                    logger.info(f"Auto Chatbot Alert dispatched successfully for user {p_name}")
                except Exception as alert_err:
                    logger.error(f"Failed to send auto chatbot alert: {alert_err}", exc_info=True)
            
            background_tasks.add_task(trigger_critical_chat_alert, p_name, p_id, phone_to_send, msg_content)

        # Build OpenAI conversation history
        formatted_history = [{"role": "system", "content": SYSTEM_PROMPT}]
        for h in data.history:
            role = "user" if h["role"] == "user" else "assistant"
            formatted_history.append({"role": role, "content": h["content"]})
        
        # Add the current user message
        formatted_history.append({"role": "user", "content": data.message})

        response_stream = await client.chat.completions.create(
            model="openrouter/free",
            messages=formatted_history,
            stream=True
        )

        # Collect full response for DB save, stream chunks to client
        full_response = []

        async def stream_generator():
            try:
                async for chunk in response_stream:
                    if chunk.choices[0].delta.content is not None:
                        text = chunk.choices[0].delta.content
                        full_response.append(text)
                        yield text
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield "\n[Error connecting to AI]"
            finally:
                # Save complete assistant response to DB after streaming ends
                complete_text = "".join(full_response)
                if complete_text:
                    try:
                        assistant_msg = ChatMessage(
                            patient_id=patient.id,
                            role="assistant",
                            content=complete_text,
                        )
                        db.add(assistant_msg)
                        await db.commit()
                    except Exception as save_err:
                        logger.error(f"Failed to save assistant message to DB: {save_err}")

        return StreamingResponse(stream_generator(), media_type="text/event-stream")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/history")
async def get_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return last 50 chat messages from DB for the current patient."""
    try:
        patient = await get_patient(db, current_user.id)
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.patient_id == patient.id)
            .order_by(ChatMessage.created_at.asc())
            .limit(50)
        )
        messages = result.scalars().all()
        return [{"role": m.role, "content": m.content} for m in messages]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/history")
async def clear_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all chat messages for the current patient from DB."""
    try:
        patient = await get_patient(db, current_user.id)
        result = await db.execute(
            select(ChatMessage).where(ChatMessage.patient_id == patient.id)
        )
        messages = result.scalars().all()
        for msg in messages:
            await db.delete(msg)
        await db.commit()
        return {"success": True, "message": "Chat history cleared"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing chat history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
