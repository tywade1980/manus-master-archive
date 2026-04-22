# Telegram Voice AI Bot — Setup Guide

**Author:** Manus AI
**Date:** February 18, 2026

## 1. Overview

The Telegram bot approach provides an alternative interface for the voice AI system that eliminates the need for exposed ports, custom web interfaces, or proxy URL management. The bot runs on the RunPod GPU pod and communicates with Telegram's servers using an outbound connection (long polling), which means no firewall rules, no port forwarding, and no HTTPS certificates are required.

The user simply opens Telegram on any device—phone, tablet, or desktop—sends a voice message, and receives a voice message back. This is particularly well-suited for hands-free operation on a construction site, as the user can hold down the microphone button, speak, and then listen to the response through their earbuds or phone speaker.

## 2. How It Works

The voice conversation pipeline operates in six steps, all handled automatically by the bot:

1. **User sends a voice message** on Telegram. Telegram stores the audio as an OGG file (Opus codec) on their servers.
2. **Bot downloads the audio** from Telegram's servers to the RunPod pod.
3. **Speech-to-text** is performed using `faster-whisper` running on the pod's GPU. The OGG file is first converted to WAV using `ffmpeg`, then transcribed.
4. **LLM processing** is handled by Ollama running locally on the pod with the `dolphin-mistral` model. The transcribed text, along with conversation history, is sent to the model.
5. **Text-to-speech** is performed by the ElevenLabs API, which returns a high-quality MP3 audio file of the AI's response.
6. **Bot sends a voice message back** to the user on Telegram. The MP3 is converted to OGG (Opus) format, which Telegram requires for voice messages.

The entire round-trip typically takes between 5 and 15 seconds, depending on the length of the user's message and the AI's response.

## 3. Prerequisites

Before setting up the Telegram bot, the following must be in place:

| Requirement                | Details                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| **RunPod GPU Pod**         | Must be running with `setup.sh` already executed (Ollama + dolphin-mistral installed).           |
| **Telegram Account**       | Any personal Telegram account to create the bot.                                                 |
| **Bot Token from BotFather** | Obtained by messaging `@BotFather` on Telegram (see Step 4 below).                            |
| **ffmpeg**                 | Already installed by `setup.sh`. Required for audio format conversion.                           |
| **Python packages**        | `python-telegram-bot`, `faster-whisper`, `httpx` — installed via pip on the pod.                 |

## 4. Getting a Telegram Bot Token

Creating a Telegram bot takes about 60 seconds and is done entirely within Telegram itself:

1. Open Telegram on your phone or desktop.
2. Search for **@BotFather** (the official Telegram bot for managing bots).
3. Send the command `/newbot`.
4. BotFather will ask for a **display name** for your bot (e.g., "Mr T Voice AI").
5. BotFather will ask for a **username** for your bot. This must end in "bot" (e.g., "mrt_voice_ai_bot").
6. BotFather will respond with your **bot token**, which looks something like `7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`.
7. Copy this token — you will need it in the next step.

## 5. Installation on RunPod

After SSH-ing into your RunPod pod (or using the web terminal), run the following commands:

```bash
# Install the Telegram bot library
pip install python-telegram-bot

# Copy the bot script to your workspace
# (assuming you've uploaded telegram_voice_bot.py to /workspace/)
cp telegram_voice_bot.py /workspace/telegram_voice_bot.py

# Set your bot token as an environment variable
export TELEGRAM_BOT_TOKEN="your_token_from_botfather"

# Start the bot
python3 /workspace/telegram_voice_bot.py
```

To run the bot in the background so it persists after you close the terminal:

```bash
export TELEGRAM_BOT_TOKEN="your_token_from_botfather"
nohup python3 /workspace/telegram_voice_bot.py > /workspace/telegram_bot.log 2>&1 &
```

## 6. Using the Bot

Once the bot is running, open Telegram and search for your bot by its username. The following interactions are supported:

| Action                     | What Happens                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Send a voice message**   | Bot transcribes it, sends to AI, converts response to speech, sends voice message back.        |
| **Send a text message**    | Bot sends to AI, responds with text.                                                           |
| **Send `/start`**          | Shows a welcome message with instructions.                                                     |
| **Send `/clear`**          | Clears conversation history for a fresh start.                                                 |
| **Send `/status`**         | Checks if Ollama, Whisper, and ElevenLabs are all operational.                                 |

The bot maintains a per-user conversation history (up to 10 exchanges), so the AI remembers context from earlier in the conversation.

## 7. Adding to Auto-Start

To have the Telegram bot start automatically when the pod starts, add the following lines to the end of `/workspace/start.sh` (before the watchdog loop):

```bash
# ─── Start Telegram Bot ────────────────────────────────────────────────────
if [ -f "/workspace/telegram_voice_bot.py" ] && [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "  Starting Telegram Voice Bot..."
    nohup python3 /workspace/telegram_voice_bot.py > /workspace/telegram_bot.log 2>&1 &
    echo "  ✓ Telegram bot started (PID: $!)"
fi
```

You will also need to set the `TELEGRAM_BOT_TOKEN` environment variable in your RunPod pod template's environment variables section so it persists across restarts.

## 8. Advantages of the Telegram Approach

The Telegram bot approach offers several practical advantages over a web-based API for this specific use case:

**No port management.** The bot uses outbound polling to Telegram's servers, so there is no need to expose ports, configure HTTPS, or manage RunPod's proxy URLs. This eliminates an entire category of setup complexity.

**Works on any device.** Telegram is available on iOS, Android, Windows, Mac, Linux, and the web. The user does not need to remember a URL or deal with authentication — they simply open Telegram and talk to their bot.

**Hands-free friendly.** On a construction site, the user can use Telegram's voice message feature with a single press-and-hold gesture, which is ideal for hands-free operation while working with tools.

**Built-in conversation history.** Telegram preserves the full conversation thread, so the user can scroll back to review previous interactions, which is not easily achieved with a simple API endpoint.

**Notifications.** Telegram provides push notifications when the bot responds, so the user does not need to keep a browser tab open or constantly check for responses.
