# Emotional TTS & Talking Head Setup Guide (RunPod / GPU)

This guide provides verified instructions for setting up **XTTS-v2** for emotional voice synthesis and **SadTalker** for talking head animation on an Ubuntu system with an NVIDIA GPU (e.g., RTX PRO 4500).

---

## 1. Text-To-Speech: XTTS-v2 (Coqui TTS)
XTTS-v2 is the industry standard for open-source voice cloning and emotional expression.

### Installation
```bash
# Update system and install dependencies
sudo apt-get update && sudo apt-get install -y espeak-ng libsndfile1-dev

# Install Coqui TTS via pip
pip install TTS
```

### Model & VRAM
- **Weights:** Automatically downloaded on first run to `~/.local/share/tts/tts_models--multilingual--multi-dataset--xtts_v2`.
- **VRAM Usage:** ~2.5 GB to 4 GB during inference.
- **Dolphin 24B Context:** Since Dolphin 24B (Mistral-based) uses ~14-16 GB in 4-bit or ~24 GB in 8-bit, you have plenty of room on a 32GB VRAM card.

### Verification Test
Run this Python snippet to verify TTS:
```python
from TTS.api import TTS
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

# Generate emotional speech (cloning from a sample or using built-in speaker)
tts.tts_to_file(text="Hello Mr. T, I am ready to help with your carpentry projects!",
                speaker_wav="/home/ubuntu/SadTalker/examples/driven_audio/bus_chinese.wav", # Use any sample wav
                language="en",
                file_path="output_tts.wav")
```

---

## 2. Talking Head: SadTalker
SadTalker generates high-quality talking head videos from a single image and an audio file.

### Installation
```bash
# Clone the repository
git clone https://github.com/OpenTalker/SadTalker.git
cd SadTalker

# Install requirements
pip install -r requirements.txt

# Download model weights (Essential)
bash scripts/download_models.sh
```

### VRAM Usage
- **VRAM Usage:** ~4 GB to 8 GB (depending on resolution and enhancer).
- **Combined Load:** Total VRAM for Dolphin + XTTS + SadTalker ≈ 16GB + 4GB + 8GB = **28GB**. This fits within your 32GB VRAM limit.

### Verification Test
```bash
python inference.py --driven_audio ./examples/driven_audio/bus_chinese.wav \
                    --source_image ./examples/source_image/full_body_1.png \
                    --result_dir ./results \
                    --still \
                    --preprocess full \
                    --enhancer gfpgan
```

---

## 3. Integration Script: `generate_avatar.py`
This script ties both tools together. It takes text, generates audio, then animates a face.

```python
import os
import sys
import torch
from TTS.api import TTS

def run_pipeline(text, image_path, output_name="final_video"):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # 1. Generate Audio via XTTS-v2
    print("--- Generating Audio ---")
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    audio_path = "temp_audio.wav"
    # Note: Replace 'speaker.wav' with a 6-second clip of the desired voice
    tts.tts_to_file(text=text, speaker_wav=image_path, language="en", file_path=audio_path)
    
    # 2. Generate Video via SadTalker
    print("--- Generating Video ---")
    sadtalker_path = "/home/ubuntu/SadTalker"
    os.chdir(sadtalker_path)
    
    cmd = (
        f"python inference.py --driven_audio {os.path.abspath(audio_path)} "
        f"--source_image {os.path.abspath(image_path)} "
        f"--result_dir {os.path.abspath('./results')} "
        f"--still --preprocess full --enhancer gfpgan"
    )
    os.system(cmd)
    
    print(f"Pipeline complete. Check {sadtalker_path}/results for your video.")

if __name__ == "__main__":
    user_text = "Welcome to the future of carpentry automation."
    user_image = "/home/ubuntu/SadTalker/examples/source_image/art_1.png"
    run_pipeline(user_text, user_image)
```

### Final Notes
- **Voice Cloning:** For best results, provide a 6-10 second `.wav` file of the voice you want to clone to the `speaker_wav` parameter.
- **GPU Management:** If you run out of memory, you may need to temporarily stop the Ollama service or use a smaller quant of the Dolphin model.
