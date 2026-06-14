import os
import json
from typing import Optional
from pydantic import ValidationError
import google.generativeai as genai
from dotenv import load_dotenv
from logic_engine import BetSlip

load_dotenv()

# Configure the default API client from env
default_api_key = os.getenv("GEMINI_API_KEY")
if default_api_key:
    genai.configure(api_key=default_api_key)

class GeminiServiceError(Exception):
    pass

class GeminiService:
    @staticmethod
    def analyze_bet_image(image_bytes: bytes, mime_type: str, user_api_key: Optional[str] = None) -> BetSlip:
        # Use user-provided key if available, otherwise fallback to server key
        active_key = user_api_key or default_api_key
        if not active_key:
            raise GeminiServiceError("No Gemini API Key found. Please set your API Key in the top-right vault modal.")

        # Reconfigure genai with the active key
        genai.configure(api_key=active_key)

        prompt = (
            "You are a sports betting risk manager. Analyze this soccer bet slip image and extract the breakdown "
            "into the following strict JSON format. RESPOND ENTIRELY IN ENGLISH, translating any team names, competitions, "
            "and markets to English if necessary. "
            'JSON structure: {"cuota_total": float, "stake_euros": float or null, "num_eventos": int, "selecciones": '
            '[{"evento": str, "mercado": str, "cuota": float, "competicion": str}]}. '
            "Only return valid JSON matching the schema."
        )

        models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash", "gemini-3-flash", "gemini-3.1-flash-lite"]
        last_error = None
        for model_name in models:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    [
                        {
                            "mime_type": mime_type,
                            "data": image_bytes
                        },
                        prompt
                    ],
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=BetSlip
                    )
                )

                text_response = response.text.strip()
                data = json.loads(text_response)
                
                # Validate with Pydantic
                validated_slip = BetSlip(**data)
                return validated_slip
            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str or "limit" in err_str:
                    print(f"[GeminiService Quota Warning] {model_name} exhausted. Trying next model... Error: {e}")
                    continue
                if isinstance(e, (json.JSONDecodeError, ValidationError)):
                    print(f"[GeminiService Parse Warning] {model_name} returned invalid/unparseable output. Trying next model... Error: {e}")
                    continue
                # For any other fatal error, raise it
                raise GeminiServiceError(f"Error processing image with Gemini model {model_name}: {str(e)}") from e

        raise GeminiServiceError("All Gemini fallback models exhausted due to rate limit/quota.") from last_error
