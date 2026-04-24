# Caroline AI Server v2

Production server for the Caroline AI assistant, running on RunPod.

## What's New in v2

| Fix / Feature | Details |
|---|---|
| **hf_transfer crash fixed** | `HF_HUB_ENABLE_HF_TRANSFER=0` set at startup |
| **Fish Speech v2** | Non-verbal cues, fast synthesis |
| **XTTS v2** | High-fidelity emotional expression |
| **MOSS-TTSD** | Natural dialogue, emotional peaks |
| **ElevenLabs** | Fallback if open-source engines fail |
| **Emotion routing** | Each emotion maps to the best engine automatically |
| **One-click redeploy** | `start.sh` pulls latest code and runs setup on first boot |

## Deployment

### First-Time Setup on RunPod

1. Create a RunPod pod (RTX 3090 or better recommended)
2. Set the container start command to:
   ```
   bash -c "cd /workspace && git clone https://github.com/tywade1980/caroline-server-v2.git && bash caroline-server-v2/start.sh"
   ```
3. Expose port `8000` (HTTP)

### One-Click Redeploy (After Pod Termination)

If your pod is terminated, create a new one and use the same start command above. The `start.sh` script will:
1. Clone the latest server code from this repo
2. Run `setup.sh` to install all dependencies (first boot only)
3. Start Ollama, Fish Speech, and the main server

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Server status and available engines |
| `/settings` | GET | Current settings |
| `/settings` | POST | Update settings |
| `/api/voice` | POST | Voice pipeline (audio in → audio out) |
| `/api/chat` | POST | Text chat with optional TTS response |
| `/docs` | GET | Interactive API documentation |

## TTS Engine Priority

The server uses emotion-based routing to pick the best engine:

| Emotion | Engine |
|---|---|
| neutral, warm, caring, sad, comforting, professional | XTTS v2 |
| intimate, dramatic, flirty | MOSS-TTSD |
| excited, playful, urgent, angry, humor | Fish Speech v2 |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ELEVENLABS_API_KEY` | Optional | ElevenLabs fallback TTS |
