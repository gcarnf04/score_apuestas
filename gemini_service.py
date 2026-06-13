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

        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
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

        except json.JSONDecodeError as e:
            print(f"[GeminiService Debug] JSONDecodeError: {e}. Response was: {text_response if 'text_response' in locals() else 'None'}")
            raise GeminiServiceError("Could not read the bet slip correctly. Please upload a clearer image.") from e
        except ValidationError as e:
            print(f"[GeminiService Debug] ValidationError: {e}. Data: {data if 'data' in locals() else 'None'}")
            raise GeminiServiceError("Could not validate the extracted bet slip data. Please upload a clearer image.") from e
        except Exception as e:
            print(f"[GeminiService Debug] General Exception: {e}")
            raise GeminiServiceError(f"Error processing image with Gemini: {str(e)}") from e
