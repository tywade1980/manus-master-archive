#!/bin/bash
# ============================================================================
#  VOICE AI SERVER - Auto-Start Script for RunPod
#
#  Place this file at: /workspace/start.sh
#
#  HOW TO MAKE THIS AUTO-RUN ON POD START:
#  ─────────────────────────────────────────
#  Option A (Recommended): Set the "Docker Command" / "Container Start Command"
#    in your RunPod pod template to:
#      bash /workspace/start.sh
#
#  Option B: Edit your pod settings and set the start command to:
#      bash -c "sleep 5 && bash /workspace/start.sh"
#
#  This script assumes setup.sh has already been run at least once.
#  It restarts Ollama and the FastAPI server automatically.
# ============================================================================

LOG_FILE="/workspace/voice-ai-server/startup.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo "============================================================"
echo "  VOICE AI AUTO-START — $(date)"
echo "============================================================"
echo ""

# ─── Function: Wait for a service ───────────────────────────────────────────
wait_for_service() {
    local url=$1
    local name=$2
    local max_wait=$3
    echo "  Waiting for $name to be ready..."
    for i in $(seq 1 $max_wait); do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "  ✓ $name is ready"
            return 0
        fi
        sleep 2
    done
    echo "  ✗ $name failed to start within ${max_wait}s"
    return 1
}

# ─── Step 1: Check if setup has been run ────────────────────────────────────
if [ ! -f "/workspace/voice-ai-server/app/main.py" ]; then
    echo "  ✗ ERROR: Voice AI Server not found."
    echo "    Run setup.sh first: bash /workspace/setup.sh"
    echo ""
    echo "  Falling back to sleep to keep pod alive..."
    sleep infinity
    exit 1
fi

# ─── Step 2: Check if Ollama is installed ───────────────────────────────────
if ! command -v ollama &> /dev/null; then
    echo "  Ollama not found. Installing..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo "  ✓ Ollama installed"
fi

# ─── Step 3: Start Ollama ───────────────────────────────────────────────────
echo ""
echo "  Starting Ollama..."

# Kill any existing Ollama process
pkill -f "ollama serve" 2>/dev/null || true
sleep 2

# Start Ollama
ollama serve > /workspace/ollama.log 2>&1 &
OLLAMA_PID=$!
echo "  Ollama PID: $OLLAMA_PID"

wait_for_service "http://localhost:11434/api/tags" "Ollama" 30

# Verify dolphin-mistral is available
if ollama list 2>/dev/null | grep -q "dolphin-mistral"; then
    echo "  ✓ dolphin-mistral model is available"
else
    echo "  Model not found, pulling dolphin-mistral..."
    ollama pull dolphin-mistral
    echo "  ✓ dolphin-mistral pulled"
fi

# ─── Step 4: Start the FastAPI Voice AI Server ──────────────────────────────
echo ""
echo "  Starting Voice AI Server on port 8000..."

# Kill any existing server process
pkill -f "uvicorn app.main:app" 2>/dev/null || true
sleep 2

cd /workspace/voice-ai-server
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /workspace/voice-ai-server/server.log 2>&1 &
SERVER_PID=$!
echo "  Server PID: $SERVER_PID"

wait_for_service "http://localhost:8000/health" "Voice AI Server" 20

# ─── Step 5: Print status ──────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  ✓ VOICE AI SERVER IS RUNNING"
echo "============================================================"
echo ""
echo "  Endpoints:"
echo "    Health:    http://localhost:8000/health"
echo "    Chat:      http://localhost:8000/api/chat"
echo "    Voice:     http://localhost:8000/api/voice"
echo "    TTS Test:  http://localhost:8000/api/tts?text=hello"
echo "    API Docs:  http://localhost:8000/docs"
echo ""
echo "  RunPod Proxy: https://{POD_ID}-8000.proxy.runpod.net/"
echo ""
echo "  Logs:"
echo "    Server: tail -f /workspace/voice-ai-server/server.log"
echo "    Ollama: tail -f /workspace/ollama.log"
echo ""
echo "  Auto-start time: $(date)"
echo "============================================================"

# ─── Keep the container alive ───────────────────────────────────────────────
# RunPod needs the start command to keep running, otherwise the pod stops.
# This loop also acts as a watchdog — restarts services if they crash.

echo ""
echo "  Entering watchdog mode (monitoring services)..."
echo ""

while true; do
    # Check if Ollama is still running
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "  [$(date)] Ollama crashed — restarting..."
        ollama serve > /workspace/ollama.log 2>&1 &
        sleep 10
    fi

    # Check if FastAPI server is still running
    if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "  [$(date)] Server crashed — restarting..."
        cd /workspace/voice-ai-server
        nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /workspace/voice-ai-server/server.log 2>&1 &
        sleep 10
    fi

    sleep 30
done
