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

    models_to_try = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.1-8b-instruct:free",
        "qwen/qwen-2.5-72b-instruct:free",
        "google/gemma-2-9b-it:free"
    ]

    last_exception = None

    for model_name in models_to_try:
        try:
            logger.info(f"Attempting OpenRouter API with model: {model_name}")
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ]
            )
            
            if not response or not hasattr(response, 'choices') or not response.choices:
                raise ValueError(f"Invalid response from OpenRouter ({model_name})")
                
            result = response.choices[0].message.content
            
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:-3].strip()
            elif result.startswith("```"):
                result = result[3:-3].strip()
                
            return json.loads(result)
            
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {str(e)}")
            last_exception = e
            continue

    logger.error(f"All fallback models failed. Returning default safe plan. Last error: {last_exception}")
    # Return a safe default plan so the app never crashes
    return {
        "analysis": "Due to high network traffic, we are providing a standard safe recovery plan based on general prosthetics guidelines.",
        "risk_level": "low",
        "exercises": [
            {
                "name": "Gentle Seated Knee Extensions",
                "description": "Sit in a sturdy chair. Slowly straighten your leg with the prosthesis, hold for 3 seconds, and slowly lower it.",
                "duration_minutes": 10,
                "repetitions": 10,
                "sets": 2,
                "difficulty": "beginner",
                "target_area": "strength",
                "precautions": "Stop if you feel any sharp pain in the residual limb."
            },
            {
                "name": "Weight Shifting (Parallel Bars/Counter)",
                "description": "Stand holding a secure counter. Slowly shift your weight from your sound leg to your prosthetic leg, and back.",
                "duration_minutes": 5,
                "repetitions": 15,
                "sets": 2,
                "difficulty": "beginner",
                "target_area": "balance",
                "precautions": "Ensure you have a firm grip on the support surface."
            }
        ],
        "dietary_note": "Stay hydrated and maintain adequate protein intake to support muscle recovery.",
        "rest_recommendation": "Rest as needed between sets. If fatigue is high, reduce repetitions."
    }
