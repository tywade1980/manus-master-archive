# Caroline AI — Voice Assistant

**Status:** In development — xAI Realtime API integration  
**Last updated:** April 22, 2026

## Overview

Caroline is Wade's personal AI voice assistant built for hands-free use on job sites. She runs on a Samsung Galaxy Z Fold as an Android APK.

## Architecture

```
[Android App] ←WebSocket→ [Railway Server] ←WebSocket→ [xAI Realtime API]
     ↑                           ↑
expo-av mic recording      audio conversion
metering-based VAD         m4a → PCM (ffmpeg)
MP3 playback               PCM → MP3 (ffmpeg)
```

## Projects

### `caroline-app-v2/` — React Native / Expo app
- **App.tsx** — Main app with metering-based VAD (800ms silence detection), mic mute during playback
- **app.json** — Expo config (package: `com.tywade1980.carolineai`)
- **eas.json** — EAS build config (preview profile → APK)
- **package.json** — Dependencies: expo-av, expo-file-system, expo-haptics, expo-keep-awake

### `caroline-server-v2/` — FastAPI server on Railway
- **main.py** — WebSocket proxy: app ↔ xAI Realtime, audio conversion, session management
- **requirements.txt** — fastapi, uvicorn, websockets, requests
- **nixpacks.toml** — Installs ffmpeg on Railway for audio conversion
- **Procfile** — `web: uvicorn main:app --host 0.0.0.0 --port $PORT`

## Critical Fix Needed

**The `XAI_API_KEY` environment variable must be set in Railway.**  
Go to: railway.app → caroline-server-v2 → Variables → add `XAI_API_KEY`  
Without this, all xAI connections silently fail with 401 and the server never returns audio.

## EAS Build

```bash
EXPO_TOKEN=<your_token> npx eas-cli build --platform android --profile preview --non-interactive
```

## Server Deploy

Auto-deploys from GitHub push to `tywade1980/caroline-server-v2` main branch via Railway.
