# Voice AI System — RunPod Deployment Package

**Prepared for:** Mr. T
**Date:** February 18, 2026

---

## What's In This Package

This package contains everything needed to deploy a fully functional voice AI system on a RunPod GPU pod. The system integrates three core technologies: **Ollama** (running the dolphin-mistral LLM), **faster-whisper** (GPU-accelerated speech-to-text), and **ElevenLabs** (high-quality text-to-speech). The result is a conversational AI companion that can receive voice input, understand it, generate a thoughtful response, and speak it back.

| File                              | Purpose                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `setup.sh`                        | **The main script.** Run once on a fresh RunPod pod. Installs everything and starts the server. |
| `start.sh`                        | Auto-start script. Place at `/workspace/start.sh` so the pod auto-launches on restart.     |
| `main.py`                         | The FastAPI server source code (also embedded in setup.sh, provided separately for reference). |
| `telegram_voice_bot.py`           | Telegram bot that provides voice interaction without needing exposed ports.                 |
| `telegram_bot_guide.md`           | Step-by-step guide for setting up the Telegram bot.                                        |
| `runpod_serverless_research.md`   | Research document on whether RunPod Serverless is viable for this system (short answer: no). |

---

## Quick Start — Three Steps

### Step 1: Create a RunPod Pod

Go to [runpod.io](https://www.runpod.io), create a GPU pod with at least **16GB VRAM** (RTX 4090, A40, or similar), and attach a **network volume** so your `/workspace/` data persists across restarts. Use the default PyTorch template.

### Step 2: Upload and Run setup.sh

Upload `setup.sh` to your pod's `/workspace/` directory (via the web terminal, SCP, or the file manager), then run it:

```bash
bash /workspace/setup.sh
```

This single command will install Ollama (using the official installer), pull the dolphin-mistral model, install all Python dependencies, create the FastAPI server, and start everything up. The script takes approximately 5–10 minutes on first run, depending on download speeds.

### Step 3: Access Your Voice AI

Once the script finishes, the server is live at `http://localhost:8000`. From outside RunPod, access it through the RunPod proxy URL:

```
https://{YOUR_POD_ID}-8000.proxy.runpod.net/
```

You can find this URL in the RunPod console under your pod's "Connect" options (look for the HTTP port 8000 link).

---

## API Endpoints

| Endpoint                    | Method | Description                                                   | Example                                                      |
| --------------------------- | ------ | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `/health`                   | GET    | Health check — shows status of Ollama, ElevenLabs, server     | `curl http://localhost:8000/health`                          |
| `/api/chat`                 | POST   | Text chat — send a message, get AI response                   | `curl -X POST -H "Content-Type: application/json" -d '{"message":"Hey!"}' http://localhost:8000/api/chat` |
| `/api/voice`                | POST   | Voice pipeline — upload audio, get audio response back        | `curl -X POST -F "audio=@recording.wav" http://localhost:8000/api/voice --output response.mp3` |
| `/api/tts?text=hello`       | GET    | Test TTS — converts text to speech and returns MP3            | `curl "http://localhost:8000/api/tts?text=Hello+world" --output test.mp3` |
| `/docs`                     | GET    | Interactive Swagger UI for testing all endpoints in browser   | Open in browser                                              |

---

## Setting Up Auto-Start (No SSH Required)

To make the pod fully automatic — so you just click "Start" on RunPod and everything comes up — follow these steps:

1. Make sure `start.sh` is saved at `/workspace/start.sh` on your pod.
2. In the RunPod console, go to your pod's settings (or create a custom template).
3. Set the **Container Start Command** to: `bash /workspace/start.sh`
4. Now every time the pod starts or restarts, Ollama and the Voice AI server will launch automatically.

The `start.sh` script also includes a **watchdog** that monitors both Ollama and the FastAPI server every 30 seconds. If either service crashes, it automatically restarts it.

---

## The Telegram Bot Option

The Telegram bot (`telegram_voice_bot.py`) provides an alternative way to interact with the voice AI that is especially well-suited for hands-free use on the job site. Instead of accessing a web URL, you simply open Telegram, send a voice message to your bot, and get a voice message back.

The key advantage is that **no ports need to be exposed** — the bot connects outbound to Telegram's servers using long polling. See `telegram_bot_guide.md` for the full setup instructions. The short version is: create a bot with @BotFather on Telegram, get a token, set it as an environment variable, and run the script.

---

## RunPod Serverless — Not Recommended

The research document (`runpod_serverless_research.md`) provides a detailed analysis, but the conclusion is straightforward: RunPod Serverless is not a good fit for this system. The cold start time — which can be 30 seconds to several minutes when scaling from zero — is fundamentally incompatible with a real-time conversational agent. A persistent GPU pod is the correct architecture for this workload.

---

## Troubleshooting

**"Ollama is not running" error from the server:**
Ollama may have crashed or not started. Run `ollama serve &` to restart it, then verify with `curl http://localhost:11434/api/tags`.

**"ElevenLabs API error" on TTS:**
Check that the API key is valid and has remaining credits. The key is hardcoded in the server code but can be overridden with the `ELEVENLABS_API_KEY` environment variable.

**Server won't start on port 8000:**
Another process may be using the port. Run `lsof -i :8000` to check, then `kill` the conflicting process.

**Voice endpoint returns "Could not transcribe any speech":**
The audio file may be in an unsupported format or contain only silence. Ensure `ffmpeg` is installed (`apt install ffmpeg`) and try with a clear WAV or MP3 recording.

**Pod restarts but services don't come up:**
Make sure `start.sh` is at `/workspace/start.sh` and the Container Start Command is set to `bash /workspace/start.sh` in your pod template settings.
