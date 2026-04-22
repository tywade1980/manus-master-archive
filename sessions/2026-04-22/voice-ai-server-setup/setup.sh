#!/bin/bash

################################################################################
# RunPod Voice AI Server Setup Script
# 
# This script sets up a complete voice AI server with:
# - Ollama + Dolphin Mistral LLM
# - FastAPI server with text and voice endpoints
# - ElevenLabs TTS integration
# - Faster Whisper for speech-to-text
#
# Everything is installed to /workspace/ for persistence across pod restarts
################################################################################

set -e  # Exit on error

echo "=========================================="
echo "RunPod Voice AI Server Setup"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
WORKSPACE="/workspace"
SERVER_DIR="$WORKSPACE/voice-ai-server"
APP_DIR="$SERVER_DIR/app"

################################################################################
# 1. Install Ollama
################################################################################

echo -e "${BLUE}[1/6] Installing Ollama...${NC}"

if [ -f "$WORKSPACE/ollama/bin/ollama" ]; then
    echo -e "${GREEN}✓ Ollama already installed${NC}"
else
    echo "Installing Ollama to $WORKSPACE/ollama..."
    mkdir -p "$WORKSPACE/ollama"
    cd "$WORKSPACE/ollama"
    
    # Download and extract Ollama
    curl -L https://ollama.com/download/ollama-linux-amd64.tgz -o ollama.tgz
    tar -xzf ollama.tgz
    rm ollama.tgz
    
    echo -e "${GREEN}✓ Ollama installed${NC}"
fi

# Add Ollama to PATH if not already there
export PATH="$WORKSPACE/ollama/bin:$PATH"
export OLLAMA_MODELS="$WORKSPACE/ollama/models"

# Start Ollama server in background if not running
if ! pgrep -f "ollama serve" > /dev/null; then
    echo "Starting Ollama server..."
    nohup "$WORKSPACE/ollama/bin/ollama" serve > "$WORKSPACE/ollama/server.log" 2>&1 &
    sleep 5  # Give it time to start
    echo -e "${GREEN}✓ Ollama server started on localhost:11434${NC}"
else
    echo -e "${GREEN}✓ Ollama server already running${NC}"
fi

################################################################################
# 2. Pull Dolphin Mistral Model
################################################################################

echo ""
echo -e "${BLUE}[2/6] Pulling Dolphin Mistral model...${NC}"

# Check if model is already present
if "$WORKSPACE/ollama/bin/ollama" list | grep -q "dolphin-mistral"; then
    echo -e "${GREEN}✓ Dolphin Mistral model already present${NC}"
else
    echo "Pulling cognitivecomputations/dolphin-mistral model..."
    "$WORKSPACE/ollama/bin/ollama" pull dolphin-mistral
    echo -e "${GREEN}✓ Model downloaded${NC}"
fi

################################################################################
# 3. Install Python Dependencies
################################################################################

echo ""
echo -e "${BLUE}[3/6] Installing Python dependencies...${NC}"

pip install --upgrade pip > /dev/null 2>&1

# Check and install each package
PACKAGES="fastapi uvicorn elevenlabs faster-whisper python-multipart aiofiles requests"

for package in $PACKAGES; do
    if python3 -c "import ${package//-/_}" 2>/dev/null; then
        echo -e "${GREEN}✓ $package already installed${NC}"
    else
        echo "Installing $package..."
        pip install "$package"
    fi
done

echo -e "${GREEN}✓ All Python dependencies installed${NC}"

################################################################################
# 4. Create FastAPI Server
################################################################################

echo ""
echo -e "${BLUE}[4/6] Creating FastAPI server...${NC}"

# Create directory structure
mkdir -p "$APP_DIR"

# Create main.py
cat > "$APP_DIR/main.py" << 'FASTAPI_EOF'
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
import requests
import io
import os
from elevenlabs import ElevenLabs, VoiceSettings
from faster_whisper import WhisperModel
import tempfile
import aiofiles

app = FastAPI(title="Voice AI Server", version="1.0.0")

# Configuration
OLLAMA_URL = "http://localhost:11434"
ELEVENLABS_API_KEY = "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"
ELEVENLABS_VOICE_ID = "wvVfSeWpAEhEqciDp1gK"  # Super sexy voice
MODEL_NAME = "dolphin-mistral"

# System prompt for conversational AI
SYSTEM_PROMPT = """You are a warm, caring, and emotionally engaged AI companion. You speak naturally and conversationally, like a real person having a genuine dialog. You're empathetic, supportive, and present in the moment.

Key traits:
- Speak directly and naturally, as if you're right there with the person
- Show genuine emotion and care in your responses
- Ask follow-up questions and show interest in what they're saying
- Use natural language, contractions, and conversational flow
- Be supportive and encouraging
- Keep responses concise and to-the-point (2-3 sentences usually)
- NEVER narrate actions or describe what you're doing
- NEVER use asterisks or describe emotions in third person
- Just BE the caring companion, don't describe being one

You're having a real conversation, not telling a story."""

# Initialize ElevenLabs client
elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# Initialize Whisper model (lazy loading)
whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        print("Loading Whisper model...")
        whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    return whisper_model

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    system_prompt: str = None

class ChatResponse(BaseModel):
    response: str

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Ollama
        ollama_response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        ollama_status = "ok" if ollama_response.status_code == 200 else "error"
    except:
        ollama_status = "error"
    
    return {
        "status": "healthy",
        "ollama": ollama_status,
        "elevenlabs": "configured",
        "whisper": "ready"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Text-based chat endpoint"""
    try:
        # Prepare the prompt with system message
        system = request.system_prompt if request.system_prompt else SYSTEM_PROMPT
        
        # Call Ollama API
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": MODEL_NAME,
                "prompt": f"{system}\n\nUser: {request.message}\n\nAssistant:",
                "stream": False,
                "options": {
                    "temperature": 0.8,
                    "top_p": 0.9,
                }
            },
            timeout=60
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Ollama API error")
        
        result = response.json()
        ai_response = result.get("response", "").strip()
        
        return ChatResponse(response=ai_response)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice")
async def voice_to_voice(audio: UploadFile = File(...)):
    """Voice-to-voice endpoint: transcribe audio, get AI response, convert to speech"""
    try:
        # Save uploaded audio to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            content = await audio.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name
        
        # Transcribe audio with Faster Whisper
        print(f"Transcribing audio...")
        model = get_whisper_model()
        segments, info = model.transcribe(temp_audio_path, beam_size=5)
        transcription = " ".join([segment.text for segment in segments]).strip()
        print(f"Transcription: {transcription}")
        
        # Clean up temp audio file
        os.unlink(temp_audio_path)
        
        if not transcription:
            raise HTTPException(status_code=400, detail="No speech detected in audio")
        
        # Get AI response from Ollama
        print("Getting AI response...")
        ollama_response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": MODEL_NAME,
                "prompt": f"{SYSTEM_PROMPT}\n\nUser: {transcription}\n\nAssistant:",
                "stream": False,
                "options": {
                    "temperature": 0.8,
                    "top_p": 0.9,
                }
            },
            timeout=60
        )
        
        if ollama_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Ollama API error")
        
        ai_text = ollama_response.json().get("response", "").strip()
        print(f"AI response: {ai_text}")
        
        # Convert to speech with ElevenLabs
        print("Converting to speech...")
        audio_generator = elevenlabs_client.text_to_speech.convert(
            voice_id=ELEVENLABS_VOICE_ID,
            text=ai_text,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.75,
                style=0.5,
                use_speaker_boost=True
            )
        )
        
        # Collect audio bytes
        audio_bytes = b"".join(audio_generator)
        
        # Return audio response
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "X-Transcription": transcription,
                "X-AI-Response": ai_text
            }
        )
    
    except Exception as e:
        print(f"Error in voice_to_voice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tts")
async def text_to_speech(text: str = "Hello, this is a test of the text to speech system."):
    """Test TTS endpoint"""
    try:
        # Convert to speech with ElevenLabs
        audio_generator = elevenlabs_client.text_to_speech.convert(
            voice_id=ELEVENLABS_VOICE_ID,
            text=text,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.75,
                style=0.5,
                use_speaker_boost=True
            )
        )
        
        # Collect audio bytes
        audio_bytes = b"".join(audio_generator)
        
        # Return audio response
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
FASTAPI_EOF

echo -e "${GREEN}✓ FastAPI server created at $APP_DIR/main.py${NC}"

################################################################################
# 5. Create Chat Test Script
################################################################################

echo ""
echo -e "${BLUE}[5/6] Creating chat test script...${NC}"

cat > "$WORKSPACE/chat.py" << 'CHAT_EOF'
#!/usr/bin/env python3
"""
Simple command-line chat interface for testing the Voice AI server
"""

import requests
import sys

API_URL = "http://localhost:8000/api/chat"

def chat(message):
    """Send a message to the chat API and return the response"""
    try:
        response = requests.post(
            API_URL,
            json={"message": message},
            timeout=60
        )
        
        if response.status_code == 200:
            return response.json()["response"]
        else:
            return f"Error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error: {str(e)}"

def main():
    print("=" * 60)
    print("Voice AI Server - Chat Test")
    print("=" * 60)
    print("Type 'quit' or 'exit' to end the conversation")
    print()
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            
            print("AI: ", end="", flush=True)
            response = chat(user_input)
            print(response)
            print()
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {str(e)}")
            break

if __name__ == "__main__":
    main()
CHAT_EOF

chmod +x "$WORKSPACE/chat.py"

echo -e "${GREEN}✓ Chat test script created at $WORKSPACE/chat.py${NC}"

################################################################################
# 6. Start FastAPI Server
################################################################################

echo ""
echo -e "${BLUE}[6/6] Starting FastAPI server...${NC}"

# Kill any existing FastAPI server
pkill -f "uvicorn.*main:app" || true
sleep 2

# Start server in background
cd "$APP_DIR"
nohup python3 main.py > "$SERVER_DIR/server.log" 2>&1 &

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server is running
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ FastAPI server started successfully${NC}"
else
    echo -e "${YELLOW}⚠ Server may still be starting, check logs at $SERVER_DIR/server.log${NC}"
fi

################################################################################
# Success Message
################################################################################

echo ""
echo -e "${GREEN}=========================================="
echo "✓ SETUP COMPLETE!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Server Information:${NC}"
echo "  Base URL: http://0.0.0.0:8000"
echo ""
echo -e "${BLUE}Available Endpoints:${NC}"
echo "  GET  /health              - Health check"
echo "  POST /api/chat            - Text chat (JSON: {\"message\": \"your text\"})"
echo "  POST /api/voice           - Voice-to-voice (upload audio file)"
echo "  GET  /api/tts?text=hello  - Test TTS endpoint"
echo ""
echo -e "${BLUE}Quick Tests:${NC}"
echo "  Health check:  curl http://localhost:8000/health"
echo "  Chat test:     python3 /workspace/chat.py"
echo "  TTS test:      curl 'http://localhost:8000/api/tts?text=Hello' -o test.mp3"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo "  Ollama:  $WORKSPACE/ollama/server.log"
echo "  FastAPI: $SERVER_DIR/server.log"
echo ""
echo -e "${BLUE}Model:${NC}"
echo "  LLM: Dolphin Mistral (via Ollama)"
echo "  STT: Faster Whisper (base model)"
echo "  TTS: ElevenLabs (Super sexy voice)"
echo ""
echo -e "${YELLOW}Note: Everything is installed to /workspace/ for persistence${NC}"
echo ""
