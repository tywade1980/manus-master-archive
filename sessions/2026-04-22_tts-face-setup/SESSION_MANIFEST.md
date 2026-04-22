# Session Manifest — 2026-04-22: TTS & Talking Head Setup

## Session Summary
Research, verification, and documentation of emotional TTS and talking head animation
tools for deployment on a RunPod instance with an NVIDIA RTX PRO 4500 Blackwell (32GB VRAM).

## Files in This Session
| File | Description |
|------|-------------|
| `tts_face_setup_guide.md` | Full verified setup guide for XTTS-v2 (Coqui TTS) and SadTalker, including install commands, model weight download instructions, VRAM estimates, and a Python integration script. |

## Tools Documented
- **XTTS-v2 (Coqui TTS)** — Emotional voice cloning TTS (~2.5–4 GB VRAM)
- **SadTalker** — Talking head animation from single image + audio (~4–8 GB VRAM)

## Integration Script
A Python pipeline script is included in `tts_face_setup_guide.md` that:
1. Takes text input
2. Runs it through XTTS-v2 to generate audio
3. Runs the audio + image through SadTalker to generate a talking head video

## Environment
- RunPod Ubuntu instance
- NVIDIA RTX PRO 4500 Blackwell — 32GB VRAM
- Ollama serving Dolphin Mistral 24B Venice Edition (already loaded)
