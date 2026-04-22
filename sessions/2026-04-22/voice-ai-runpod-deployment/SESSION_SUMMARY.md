# Session Summary — Voice AI RunPod Deployment

**Date:** 2026-04-22
**Session Type:** Infrastructure / Deployment Scripts
**Status:** Complete (V1 delivered; V2 upgrade in progress — new TTS stack)

## What Was Built

This session produced a complete deployment package for a voice AI system running on a RunPod GPU pod. The system integrates Ollama (dolphin-mistral LLM), faster-whisper (GPU speech-to-text), and ElevenLabs (text-to-speech) into a FastAPI server with a full voice pipeline.

## Files in This Folder

| File | Description |
|------|-------------|
| `setup.sh` | Main RunPod setup script. Run once on a fresh pod. Installs Ollama via official installer, pulls dolphin-mistral, installs Python deps, creates and starts FastAPI server on port 8000. |
| `start.sh` | Auto-start script. Place at `/workspace/start.sh` and set as Container Start Command in RunPod template. Includes watchdog loop. |
| `main.py` | FastAPI server source. Endpoints: GET /health, POST /api/chat, POST /api/voice, GET /api/tts. |
| `telegram_voice_bot.py` | Telegram bot for hands-free voice interaction. No exposed ports needed. Receive voice → transcribe → LLM → TTS → send voice back. |
| `telegram_bot_guide.md` | Step-by-step guide for Telegram bot setup including BotFather token creation. |
| `runpod_serverless_research.md` | Research doc on RunPod Serverless feasibility. Conclusion: not suitable due to cold start latency. |
| `README_VOICE_AI_DEPLOYMENT.md` | Master README tying all deliverables together with quick-start guide and troubleshooting. |
| `research_notes.md` | Raw research notes on RunPod auto-start, serverless, and Telegram bot patterns. |

## Key Technical Decisions

- Ollama installed via `curl -fsSL https://ollama.com/install.sh | sh` (official method — fixes prior bad URL error)
- All files installed to `/workspace/` for RunPod network volume persistence
- ElevenLabs API key: `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`
- ElevenLabs Voice ID: `wvVfSeWpAEhEqciDp1gK`
- System prompt designed for empathetic, conversational companion (not assistant-style narration)

## Pending — V2 Upgrade (Next Session)

User requested a significant stack upgrade mid-session:
- **LLM:** Switch to a stronger uncensored Mistral variant via Ollama
- **TTS Stack:** Replace ElevenLabs with multi-engine open-source TTS:
  - Fish Speech 1.5 (nonverbal cues, 64+ emotions)
  - XTTS v2 / Coqui (high fidelity, emotional expression)
  - Chatterbox TTS (voice cloning, emotion control)
  - MOSS-TTSD (natural dialog, emotional peaks, multi-speaker)
- **STT:** Evaluate Deepgram as alternative to faster-whisper
- Research was started but V2 scripts not yet completed when archive push was requested
