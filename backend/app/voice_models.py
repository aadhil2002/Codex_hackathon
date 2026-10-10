"""Supported model and voice choices for the Voice Lab UI."""

TRANSCRIPTION_MODELS = {
    "gpt-transcribe": "Recommended general transcription model",
    "gpt-4o-transcribe": "High accuracy transcription model",
    "gpt-4o-mini-transcribe": "Smaller transcription model",
    "whisper-1": "Whisper transcription model",
}

# Cloud keys are checked separately so one provider can be used without another.
SARVAM_MODELS = {
    "sarvam-saaras-v4": "Sarvam Saaras v4 · 22 Indian languages + English transcription and translation",
}
HF_MODELS = {
    "hf-indic-seamless": "Hugging Face IndicSeamless · local Indian-language speech translation to English (CC BY-NC 4.0)",
}

SARVAM_LANGUAGE_CODES = {
    "hi-IN", "bn-IN", "ta-IN", "te-IN", "mr-IN", "gu-IN", "kn-IN", "ml-IN",
    "pa-IN", "od-IN", "as-IN", "ur-IN", "ne-IN", "kok-IN", "ks-IN", "sd-IN",
    "sa-IN", "sat-IN", "mni-IN", "brx-IN", "mai-IN", "doi-IN", "en-IN",
}

TTS_MODELS = {
    "gpt-4o-mini-tts": {
        "description": "Instruction controlled speech generation",
        "voices": ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"],
        "instructions": True,
    },
    "tts-1": {
        "description": "Lower latency speech generation",
        "voices": ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"],
        "instructions": False,
    },
    "tts-1-hd": {
        "description": "Higher quality legacy speech generation",
        "voices": ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"],
        "instructions": False,
    },
}
