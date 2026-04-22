# Research Notes

## RunPod Auto-Start
- Pod templates have a "Container start command" field that overrides Docker CMD
- Example: `bash -c 'mkdir /workspace && /start.sh'`
- /workspace is the persistent volume mount path (survives pod restarts)
- You can set the start command to: `bash /workspace/start.sh`
- The start command runs every time the pod starts/restarts
- Files in /workspace persist across pod restarts when using a network volume

## RunPod Serverless
- Requires a Docker image with a handler function using `runpod` Python SDK
- Handler function receives `event` dict with `input` key
- Must be packaged as Docker image and pushed to Docker Hub
- Deployed via RunPod console as a "Serverless Endpoint"
- Auto-scales from 0 to N workers based on demand
- Pay per millisecond of compute time
- Challenge for voice AI: Ollama needs to be baked into Docker image, large model files
- Serverless has cold start times when scaling from 0

## Telegram Bot Voice Messages
- python-telegram-bot library handles voice messages
- Voice messages come as .ogg files (Opus codec)
- Bot can download voice file, transcribe with Whisper, process, and send back
- Can send voice messages back using send_voice()
- No exposed ports needed - bot connects outbound to Telegram API
