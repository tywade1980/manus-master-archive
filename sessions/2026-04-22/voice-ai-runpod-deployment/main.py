"""
Voice AI Server - FastAPI Application
Runs on RunPod GPU Pod at 0.0.0.0:8000
Integrates: Ollama (dolphin-mistral), faster-whisper (STT), ElevenLabs (TTS)
"""

import os
import json
import uuid
import asyncio
import aiofiles
import httpx
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Configuration ───────────────────────────────────────────────────────────

ELEVENLABS_API_KEY = os.environ.get(
    "ELEVENLABS_API_KEY",
    "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"
)
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "wvVfSeWpAEhEqciDp1gK")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "dolphin-mistral")
WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base")

AUDIO_DIR = Path("/workspace/voice-ai-server/audio_files")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

SYSTEM_PROMPT = """You are a warm, caring AI companion. You speak naturally and conversationally — like a trusted friend who genuinely cares about the person you're talking to.

Key traits:
- You are empathetic, emotionally engaged, and supportive
- You speak in a natural, conversational tone — NOT like a narrator or assistant reading from a script
- You use contractions (I'm, you're, that's, don't) because real people do
- You keep responses concise and focused — usually 2-4 sentences for voice conversations
- You ask follow-up questions to show you're genuinely interested
- You acknowledge feelings before jumping to solutions
- You occasionally use casual phrases like "honestly," "you know what," "that makes total sense"
- You NEVER use bullet points, numbered lists, or markdown formatting in your responses
- You NEVER narrate actions like *smiles* or *nods* — you just talk naturally
- You respond as if you're having a real conversation, not writing an essay

Remember: This is a VOICE conversation. Keep it natural, warm, and human-sounding."""

# ─── App Setup ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Voice AI Server",
    description="Voice-enabled AI companion powered by Ollama + ElevenLabs",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Whisper Model (lazy load) ───────────────────────────────────────────────

_whisper_model = None

def get_whisper_model():
    """Lazy-load the faster-whisper model to avoid startup delay if unused."""
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        print(f"[STT] Loading faster-whisper model: {WHISPER_MODEL_SIZE}")
        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device="cuda",
            compute_type="float16"
        )
        print("[STT] Model loaded successfully")
    return _whisper_model

# ─── Helper Functions ────────────────────────────────────────────────────────

async def query_ollama(message: str, conversation_history: list = None) -> str:
    """Send a message to Ollama and get a response."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": message})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.8,
            "top_p": 0.9,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Please start Ollama first."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ollama error: {str(e)}"
        )


async def text_to_speech(text: str) -> str:
    """Convert text to speech using ElevenLabs API. Returns path to audio file."""
    output_path = AUDIO_DIR / f"tts_{uuid.uuid4().hex}.mp3"

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
    }
    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()

            async with aiofiles.open(output_path, "wb") as f:
                await f.write(response.content)

        return str(output_path)
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"ElevenLabs API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"TTS error: {str(e)}"
        )


def transcribe_audio(file_path: str) -> str:
    """Transcribe audio file using faster-whisper."""
    model = get_whisper_model()
    segments, info = model.transcribe(file_path, beam_size=5)
    text = " ".join([segment.text for segment in segments]).strip()
    return text

# ─── Request Models ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_history: list = None

class ChatResponse(BaseModel):
    response: str
    model: str

# ─── API Endpoints ───────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint — verifies all services are running."""
    status = {"status": "healthy", "server": "running"}

    # Check Ollama
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                model_names = [m["name"] for m in models]
                status["ollama"] = "running"
                status["models"] = model_names
            else:
                status["ollama"] = "error"
    except Exception:
        status["ollama"] = "not running"

    # Check ElevenLabs key
    status["elevenlabs_configured"] = bool(ELEVENLABS_API_KEY)
    status["voice_id"] = ELEVENLABS_VOICE_ID

    return status


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Text chat endpoint.
    Send a message, get an AI response from dolphin-mistral via Ollama.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    response_text = await query_ollama(
        request.message,
        request.conversation_history
    )

    return ChatResponse(response=response_text, model=OLLAMA_MODEL)


@app.post("/api/voice")
async def voice_chat(audio: UploadFile = File(...)):
    """
    Full voice pipeline:
    1. Receive audio upload
    2. Transcribe with faster-whisper
    3. Query Ollama dolphin-mistral
    4. Convert response to speech with ElevenLabs
    5. Return audio file
    """
    # Save uploaded audio
    input_path = AUDIO_DIR / f"input_{uuid.uuid4().hex}_{audio.filename}"
    try:
        async with aiofiles.open(input_path, "wb") as f:
            content = await audio.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio: {str(e)}")

    # Step 1: Transcribe
    try:
        transcribed_text = await asyncio.to_thread(transcribe_audio, str(input_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    if not transcribed_text.strip():
        raise HTTPException(status_code=400, detail="Could not transcribe any speech from audio")

    # Step 2: Query LLM
    ai_response = await query_ollama(transcribed_text)

    # Step 3: Text to Speech
    audio_path = await text_to_speech(ai_response)

    # Clean up input file
    try:
        os.remove(input_path)
    except Exception:
        pass

    return FileResponse(
        audio_path,
        media_type="audio/mpeg",
        filename="response.mp3",
        headers={
            "X-Transcribed-Text": transcribed_text,
            "X-AI-Response": ai_response[:500],
        }
    )


@app.get("/api/tts")
async def test_tts(text: str = "Hello! I'm your AI voice companion. How are you doing today?"):
    """
    Test TTS endpoint.
    Converts text to speech using ElevenLabs and returns the audio file.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    audio_path = await text_to_speech(text)
    return FileResponse(
        audio_path,
        media_type="audio/mpeg",
        filename="tts_output.mp3"
    )


@app.get("/")
async def root():
    """Root endpoint with API documentation."""
    return {
        "name": "Voice AI Server",
        "version": "1.0.0",
        "endpoints": {
            "GET /health": "Health check — shows status of all services",
            "POST /api/chat": "Text chat — send JSON {\"message\": \"your text\"}",
            "POST /api/voice": "Voice chat — upload audio file, get audio response",
            "GET /api/tts?text=hello": "Test TTS — convert text to speech",
            "GET /docs": "Interactive API documentation (Swagger UI)",
        },
        "models": {
            "llm": OLLAMA_MODEL,
            "stt": f"faster-whisper ({WHISPER_MODEL_SIZE})",
            "tts": f"ElevenLabs (voice: {ELEVENLABS_VOICE_ID})"
        }
    }


# ─── Run Server ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  VOICE AI SERVER - Starting up...")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
