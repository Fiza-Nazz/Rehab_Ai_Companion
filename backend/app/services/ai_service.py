import json
import logging
from openai import OpenAI
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize OpenRouter client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY
)

def generate_exercise_plan_ai(checkin_data: list, patient_profile: dict, setback_probability: float = 0.0) -> dict:
    system_prompt = """You are a certified rehabilitation specialist and prosthetics physiotherapist with 20 years of clinical experience. You analyze daily patient data and generate safe, personalized exercise plans for prosthetics users.

CRITICAL RULES:
- Never suggest exercises that could damage the residual limb or socket
- Always recommend rest if pain score is above 7
- Scale exercise intensity DOWN if fatigue > 7
- Always include at least one low-impact exercise
- Return ONLY valid JSON. No markdown, no explanation, no preamble.
- The JSON must exactly match the schema:
{
  "analysis": "Brief 2-3 sentence analysis of patient's recent trend",
  "risk_level": "low | medium | high",
  "exercises": [
    {
      "name": "Exercise name",
      "description": "Clear step-by-step instruction",
      "duration_minutes": 10,
      "repetitions": 3,
      "sets": 2,
      "difficulty": "beginner | intermediate | advanced",
      "target_area": "residual_limb | socket_fit | balance | strength",
      "precautions": "Any warning or precaution for this exercise"
    }
  ],
  "dietary_note": "Optional nutrition suggestion",
  "rest_recommendation": "How much rest is recommended today"
}
- If data is insufficient (less than 3 days), return a basic beginner plan with risk_level: "unknown"
"""

    user_content = f"Patient Profile: {json.dumps(patient_profile)}\nCheckin Data (last 14 days): {json.dumps(checkin_data)}\nCurrent setback probability: {setback_probability}"

    try:
        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            response_format={"type": "json_object"}
        )
        result = response.choices[0].message.content
        return json.loads(result)
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}", exc_info=True)
        raise e
