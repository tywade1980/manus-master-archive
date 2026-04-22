"""
Telegram Voice AI Bot
=====================
Runs on a RunPod GPU pod alongside Ollama.
Receives voice messages, transcribes them, gets AI response, 
converts to speech, and sends voice message back.

NO exposed ports needed — the bot connects outbound to Telegram's API.

Setup:
  1. Talk to @BotFather on Telegram to create a bot and get your token
  2. Set your token: export TELEGRAM_BOT_TOKEN="your_token_here"
  3. Run: python3 telegram_voice_bot.py

Dependencies:
  pip install python-telegram-bot faster-whisper httpx elevenlabs aiofiles
"""

import os
import uuid
import asyncio
import logging
import tempfile
import subprocess
from pathlib import Path

import httpx
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

# ─── Configuration ───────────────────────────────────────────────────────────

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")

ELEVENLABS_API_KEY = os.environ.get(
    "ELEVENLABS_API_KEY",
    "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"
)
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "wvVfSeWpAEhEqciDp1gK")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "dolphin-mistral")
WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base")

AUDIO_DIR = Path("/workspace/telegram-bot/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# ─── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ─── System Prompt ───────────────────────────────────────────────────────────

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

# ─── Whisper Model (lazy load) ───────────────────────────────────────────────

_whisper_model = None

def get_whisper_model():
    """Lazy-load the faster-whisper model."""
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        logger.info(f"Loading faster-whisper model: {WHISPER_MODEL_SIZE}")
        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device="cuda",
            compute_type="float16"
        )
        logger.info("Whisper model loaded successfully")
    return _whisper_model

# ─── Conversation History (per user) ────────────────────────────────────────

# Simple in-memory conversation history — keeps last 10 exchanges per user
conversation_histories = {}
MAX_HISTORY = 10

def get_history(user_id: int) -> list:
    """Get conversation history for a user."""
    return conversation_histories.get(user_id, [])

def add_to_history(user_id: int, role: str, content: str):
    """Add a message to a user's conversation history."""
    if user_id not in conversation_histories:
        conversation_histories[user_id] = []
    conversation_histories[user_id].append({"role": role, "content": content})
    # Keep only the last MAX_HISTORY messages
    if len(conversation_histories[user_id]) > MAX_HISTORY * 2:
        conversation_histories[user_id] = conversation_histories[user_id][-MAX_HISTORY * 2:]

# ─── Helper Functions ────────────────────────────────────────────────────────

def transcribe_audio(file_path: str) -> str:
    """Transcribe audio file using faster-whisper."""
    model = get_whisper_model()
    segments, info = model.transcribe(file_path, beam_size=5)
    text = " ".join([segment.text for segment in segments]).strip()
    return text


async def query_ollama(message: str, user_id: int) -> str:
    """Send a message to Ollama and get a response."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(get_history(user_id))
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

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]


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

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()

        with open(output_path, "wb") as f:
            f.write(response.content)

    return str(output_path)


def convert_ogg_to_wav(ogg_path: str) -> str:
    """Convert OGG (Opus) voice message to WAV for Whisper compatibility."""
    wav_path = ogg_path.replace(".ogg", ".wav")
    subprocess.run(
        ["ffmpeg", "-i", ogg_path, "-ar", "16000", "-ac", "1", "-y", wav_path],
        capture_output=True,
        check=True,
    )
    return wav_path


def convert_mp3_to_ogg(mp3_path: str) -> str:
    """Convert MP3 to OGG (Opus) for Telegram voice message format."""
    ogg_path = mp3_path.replace(".mp3", ".ogg")
    subprocess.run(
        ["ffmpeg", "-i", mp3_path, "-c:a", "libopus", "-b:a", "64k", "-y", ogg_path],
        capture_output=True,
        check=True,
    )
    return ogg_path

# ─── Bot Command Handlers ───────────────────────────────────────────────────

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    await update.message.reply_text(
        "Hey there! I'm your AI voice companion. 🎙️\n\n"
        "Just send me a voice message and I'll respond with a voice message back!\n\n"
        "You can also type text and I'll respond in text.\n\n"
        "Commands:\n"
        "/start - Show this message\n"
        "/clear - Clear conversation history\n"
        "/status - Check if all services are running"
    )


async def clear_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /clear command — resets conversation history."""
    user_id = update.effective_user.id
    conversation_histories.pop(user_id, None)
    await update.message.reply_text("Conversation history cleared! Let's start fresh.")


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command — checks service health."""
    status_parts = []

    # Check Ollama
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                model_names = [m["name"] for m in models]
                status_parts.append(f"✅ Ollama: Running ({', '.join(model_names)})")
            else:
                status_parts.append("❌ Ollama: Error")
    except Exception:
        status_parts.append("❌ Ollama: Not running")

    # Check ElevenLabs
    status_parts.append(
        f"✅ ElevenLabs: Configured" if ELEVENLABS_API_KEY else "❌ ElevenLabs: No API key"
    )

    # Check Whisper
    try:
        get_whisper_model()
        status_parts.append("✅ Whisper: Loaded")
    except Exception as e:
        status_parts.append(f"❌ Whisper: {str(e)[:50]}")

    await update.message.reply_text("System Status:\n" + "\n".join(status_parts))

# ─── Message Handlers ───────────────────────────────────────────────────────

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle incoming voice messages:
    1. Download the voice message (OGG format)
    2. Convert to WAV
    3. Transcribe with faster-whisper
    4. Query Ollama
    5. Convert response to speech with ElevenLabs
    6. Send voice message back
    """
    user_id = update.effective_user.id
    user_name = update.effective_user.first_name or "Friend"

    # Show "recording" action while processing
    await update.message.chat.send_action("record_voice")

    try:
        # Step 1: Download voice message
        voice = update.message.voice
        voice_file = await voice.get_file()
        ogg_path = str(AUDIO_DIR / f"voice_{uuid.uuid4().hex}.ogg")
        await voice_file.download_to_drive(ogg_path)
        logger.info(f"Downloaded voice message from {user_name} ({voice.duration}s)")

        # Step 2: Convert OGG to WAV
        wav_path = convert_ogg_to_wav(ogg_path)

        # Step 3: Transcribe
        await update.message.chat.send_action("typing")
        transcribed_text = await asyncio.to_thread(transcribe_audio, wav_path)
        logger.info(f"Transcribed: '{transcribed_text}'")

        if not transcribed_text.strip():
            await update.message.reply_text(
                "I couldn't quite catch what you said. Could you try again?"
            )
            return

        # Send transcription as a text reply (so user can see what was heard)
        await update.message.reply_text(f"🎤 I heard: \"{transcribed_text}\"")

        # Step 4: Query Ollama
        await update.message.chat.send_action("typing")
        add_to_history(user_id, "user", transcribed_text)
        ai_response = await query_ollama(transcribed_text, user_id)
        add_to_history(user_id, "assistant", ai_response)
        logger.info(f"AI response: '{ai_response[:100]}...'")

        # Step 5: Convert to speech
        await update.message.chat.send_action("record_voice")
        mp3_path = await text_to_speech(ai_response)
        ogg_response_path = convert_mp3_to_ogg(mp3_path)

        # Step 6: Send voice message back
        with open(ogg_response_path, "rb") as audio_file:
            await update.message.reply_voice(voice=audio_file)

        # Also send text version
        await update.message.reply_text(f"💬 {ai_response}")

        # Cleanup temp files
        for f in [ogg_path, wav_path, mp3_path, ogg_response_path]:
            try:
                os.remove(f)
            except Exception:
                pass

    except Exception as e:
        logger.error(f"Error processing voice message: {e}", exc_info=True)
        await update.message.reply_text(
            f"Sorry, I ran into an issue processing your voice message. "
            f"Error: {str(e)[:200]}"
        )


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming text messages — respond with text."""
    user_id = update.effective_user.id
    user_text = update.message.text

    if not user_text.strip():
        return

    await update.message.chat.send_action("typing")

    try:
        add_to_history(user_id, "user", user_text)
        ai_response = await query_ollama(user_text, user_id)
        add_to_history(user_id, "assistant", ai_response)

        await update.message.reply_text(ai_response)

    except Exception as e:
        logger.error(f"Error processing text message: {e}", exc_info=True)
        await update.message.reply_text(
            f"Sorry, I ran into an issue. Error: {str(e)[:200]}"
        )

# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    """Start the Telegram bot."""
    if TELEGRAM_BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        print("=" * 60)
        print("  ERROR: Telegram Bot Token not set!")
        print("")
        print("  To get a token:")
        print("  1. Open Telegram and search for @BotFather")
        print("  2. Send /newbot and follow the prompts")
        print("  3. Copy the token BotFather gives you")
        print("")
        print("  Then set it:")
        print("  export TELEGRAM_BOT_TOKEN='your_token_here'")
        print("  python3 telegram_voice_bot.py")
        print("=" * 60)
        return

    print("=" * 60)
    print("  TELEGRAM VOICE AI BOT - Starting...")
    print("=" * 60)
    print(f"  Model: {OLLAMA_MODEL}")
    print(f"  Whisper: {WHISPER_MODEL_SIZE}")
    print(f"  ElevenLabs Voice: {ELEVENLABS_VOICE_ID}")
    print("=" * 60)

    # Build the application
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Register handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("clear", clear_command))
    application.add_handler(CommandHandler("status", status_command))
    application.add_handler(MessageHandler(filters.VOICE, handle_voice))
    application.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND, handle_text
    ))

    # Start polling
    print("\n  Bot is running! Send a voice message on Telegram.")
    print("  Press Ctrl+C to stop.\n")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
