import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from gemini_service import GeminiService, GeminiServiceError
from logic_engine import BetAuditor

app = FastAPI(title="Betting Reality Check API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

@app.post("/api/analyze-bet")
async def analyze_bet(
    file: UploadFile = File(...),
    x_gemini_api_key: Optional[str] = Header(None)
):
    # 1. Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only JPEG, PNG, or WEBP images are allowed."
        )

    # 2. Read contents and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="The file size exceeds the maximum limit of 5 MB."
        )

    try:
        # 3. Call Gemini Service passing user-provided vault key
        validated_slip = GeminiService.analyze_bet_image(
            contents, 
            file.content_type, 
            user_api_key=x_gemini_api_key
        )
        
        # Log detected bet slip details to terminal
        print("\n" + "="*50)
        print("🔍 DETECTED BET DETAILS:")
        print(f"  Cuota Total: {validated_slip.cuota_total}")
        print(f"  Stake Euros: {validated_slip.stake_euros}")
        print(f"  Num Eventos: {validated_slip.num_eventos}")
        for idx, sel in enumerate(validated_slip.selecciones, 1):
            print(f"  [Selección {idx}]: {sel.evento} | {sel.mercado} | {sel.cuota} | {sel.competicion}")
        print("="*50 + "\n")

        # 4. Audit Bet using logic engine
        auditor = BetAuditor(validated_slip)
        result = auditor.audit()
        
        return result

    except GeminiServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

# Serve static files from the same directory (FastAPI serves index.html at root)
current_dir = os.path.dirname(os.path.abspath(__file__))
app.mount("/", StaticFiles(directory=current_dir, html=True), name="static")
