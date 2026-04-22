# Voice AI Server Setup — Session 2026-04-22

## Overview

This session produced a complete RunPod GPU pod setup script for a voice AI server.

## Files

| File | Description |
|------|-------------|
| `setup.sh` | Complete bash setup script — run once on a fresh RunPod pod to install and start the entire voice AI stack |

## What `setup.sh` Does

1. **Installs Ollama** to `/workspace/ollama/` and starts it on `localhost:11434`
2. **Pulls Dolphin Mistral** (`cognitivecomputations/dolphin-mistral`) LLM model
3. **Installs Python dependencies**: `fastapi`, `uvicorn`, `elevenlabs`, `faster-whisper`, `python-multipart`, `aiofiles`
4. **Creates FastAPI server** at `/workspace/voice-ai-server/app/main.py` with endpoints:
   - `GET /health` — health check
   - `POST /api/chat` — text chat (JSON `{"message": "..."}`)
   - `POST /api/voice` — voice-to-voice (audio upload → transcribe → AI → TTS → audio response)
   - `GET /api/tts?text=hello` — test TTS
5. **Creates `/workspace/chat.py`** — CLI text chat test script
6. **Starts FastAPI server** on `0.0.0.0:8000`

## Configuration

- **LLM**: Dolphin Mistral via Ollama
- **STT**: Faster Whisper (base model, CPU/int8)
- **TTS**: ElevenLabs — Voice ID `wvVfSeWpAEhEqciDp1gK` ("Super sexy")
- **All paths**: `/workspace/` for RunPod persistence across pod restarts

## Usage

```bash
# On a fresh RunPod pod:
bash setup.sh

# Test endpoints:
curl http://localhost:8000/health
python3 /workspace/chat.py
curl 'http://localhost:8000/api/tts?text=Hello+Wade' -o test.mp3
```
