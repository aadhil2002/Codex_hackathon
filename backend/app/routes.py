import asyncio
import re
import tempfile
import threading
import time
from pathlib import Path
from typing import Literal

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from openai import OpenAI
from pydantic import BaseModel, Field

from app.config import HF_TOKEN, MAX_AUDIO_BYTES, OPENAI_API_KEY, SARVAM_API_KEY
from app.voice_models import HF_MODELS, SARVAM_LANGUAGE_CODES, SARVAM_MODELS, TRANSCRIPTION_MODELS, TTS_MODELS


router = APIRouter(prefix="/api/voice", tags=["voice"])
ALLOWED_AUDIO_EXTENSIONS = {"flac", "mp3", "mp4", "m4a", "mpeg", "mpga", "oga", "ogg", "wav", "webm"}
HF_MODEL_ID = "ai4bharat/indic-seamless"
_hf_pipeline = None
_hf_lock = threading.Lock()


class SpeechRequest(BaseModel):
    model: str = "gpt-4o-mini-tts"
    voice: str = "coral"
    input: str = Field(min_length=1, max_length=2000)
    instructions: str | None = Field(default=None, max_length=1000)
    response_format: Literal["mp3", "wav"] = "mp3"


def _require_api_key() -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="Set OPENAI_API_KEY in backend/.env to use OpenAI voice models")
    return OPENAI_API_KEY


async def _read_audio(audio: UploadFile) -> tuple[bytes, str, str]:
    filename = Path(audio.filename or "recording.webm").name
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Use a supported audio file such as webm, wav, mp3, or m4a")
    content = await audio.read(MAX_AUDIO_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The audio file is empty")
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="The audio file exceeds the configured size limit")
    return content, filename, audio.content_type or "application/octet-stream"


def _transcribe(api_key: str, model: str, content: bytes, filename: str, content_type: str, prompt: str | None, language_code: str) -> str:
    with OpenAI(api_key=api_key) as client:
        kwargs = {"model": model, "file": (filename, content, content_type)}
        if prompt:
            kwargs["prompt"] = prompt
        openai_language = language_code.split("-", 1)[0]
        if openai_language in {"en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "ur", "ne"}:
            kwargs["language"] = openai_language
        response = client.audio.transcriptions.create(**kwargs)
        return response.text.strip()


def _translate_openai(api_key: str, content: bytes, filename: str, content_type: str) -> str:
    with OpenAI(api_key=api_key) as client:
        response = client.audio.translations.create(
            model="whisper-1", file=(filename, content, content_type)
        )
        return response.text.strip()


def _sarvam_transcribe(content: bytes, filename: str, content_type: str, translate: bool, language_code: str) -> str:
    if not SARVAM_API_KEY:
        raise RuntimeError("Set SARVAM_API_KEY in backend/.env to use Sarvam models")
    response = httpx.post(
        "https://api.sarvam.ai/speech-to-text",
        headers={"api-subscription-key": SARVAM_API_KEY},
        data={
            "model": "saaras:v4",
            "mode": "translate" if translate else "transcribe",
            "language_code": language_code,
        },
        files={"file": (filename, content, content_type)},
        timeout=90,
    )
    response.raise_for_status()
    result = response.json()
    return (result.get("transcript") or "").strip()


def _huggingface_translate(content: bytes, filename: str) -> str:
    """Run the optional IndicSeamless model locally; its first use downloads model weights."""
    global _hf_pipeline
    try:
        from transformers import pipeline
    except ImportError as exc:
        raise RuntimeError("Install backend/requirements-hf.txt to enable the local Hugging Face model") from exc

    with _hf_lock:
        if _hf_pipeline is None:
            _hf_pipeline = pipeline("automatic-speech-recognition", model=HF_MODEL_ID, token=HF_TOKEN)

    suffix = Path(filename).suffix or ".audio"
    with tempfile.NamedTemporaryFile(suffix=suffix) as audio_file:
        audio_file.write(content)
        audio_file.flush()
        output = _hf_pipeline(audio_file.name, generate_kwargs={"tgt_lang": "eng"})
    return (output.get("text") or "").strip()


@router.get("/models")
async def voice_models() -> dict:
    return {
        "configured": bool(OPENAI_API_KEY or SARVAM_API_KEY or HF_TOKEN),
        "providers": {"openai": bool(OPENAI_API_KEY), "sarvam": bool(SARVAM_API_KEY), "huggingface": bool(HF_TOKEN)},
        "transcription": [
            {"id": model, "description": description, "provider": "openai"}
            for model, description in TRANSCRIPTION_MODELS.items()
        ] + [
            {"id": model, "description": description, "provider": "sarvam"}
            for model, description in SARVAM_MODELS.items()
        ] + [
            {"id": model, "description": description, "provider": "huggingface"}
            for model, description in HF_MODELS.items()
        ],
        "speech": [
            {"id": model, **details}
            for model, details in TTS_MODELS.items()
        ],
    }


@router.post("/compare")
async def compare_transcription_models(
    audio: UploadFile = File(...),
    models: list[str] = Form(...),
    prompt: str | None = Form(default=None, max_length=1000),
    translate_to_english: bool = Form(default=False),
    language_code: str = Form(default="unknown"),
) -> dict:
    unique_models = list(dict.fromkeys(models))
    if not unique_models or len(unique_models) > 4:
        raise HTTPException(status_code=422, detail="Choose between one and four transcription models")
    all_models = {**TRANSCRIPTION_MODELS, **SARVAM_MODELS, **HF_MODELS}
    unknown = [model for model in unique_models if model not in all_models]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unsupported transcription model: {unknown[0]}")
    if language_code != "unknown" and language_code not in SARVAM_LANGUAGE_CODES:
        raise HTTPException(status_code=422, detail="Choose a supported Indian language or English, or use auto detect")
    content, filename, content_type = await _read_audio(audio)

    async def compare_one(model: str) -> dict:
        started = time.perf_counter()
        try:
            if model in TRANSCRIPTION_MODELS:
                if not OPENAI_API_KEY:
                    raise RuntimeError("Set OPENAI_API_KEY in backend/.env to use OpenAI models")
                if translate_to_english and model != "whisper-1":
                    raise RuntimeError("OpenAI English translation is available only with whisper-1; use Sarvam or Hugging Face for translation")
                if translate_to_english:
                    transcript = await asyncio.to_thread(_translate_openai, OPENAI_API_KEY, content, filename, content_type)
                else:
                    transcript = await asyncio.to_thread(
                        _transcribe, OPENAI_API_KEY, model, content, filename, content_type, prompt, language_code
                    )
            elif model in SARVAM_MODELS:
                if translate_to_english and not SARVAM_API_KEY:
                    raise RuntimeError("Set SARVAM_API_KEY in backend/.env to use Sarvam models")
                transcript = await asyncio.to_thread(
                    _sarvam_transcribe, content, filename, content_type, translate_to_english, language_code
                )
            else:
                if not translate_to_english:
                    raise RuntimeError("IndicSeamless comparison currently returns English translation; select English output")
                transcript = await asyncio.to_thread(_huggingface_translate, content, filename)
            return {
                "model": model,
                "transcript": transcript,
                "duration_ms": round((time.perf_counter() - started) * 1000),
                "error": None,
            }
        except Exception as exc:
            if model in HF_MODELS:
                detail = str(exc).replace(HF_TOKEN or "\0", "[redacted]")
                detail = re.sub(r"hf_[A-Za-z0-9]{16,}", "[redacted]", detail)
                detail = " ".join(detail.split())[:320]
                error = f"{type(exc).__name__}: {detail or 'local model load or audio decoding failed'}"
            else:
                error = str(exc) if isinstance(exc, RuntimeError) else f"{type(exc).__name__}: provider request failed; check credentials, model access, and try again."
            return {
                "model": model,
                "transcript": None,
                "duration_ms": round((time.perf_counter() - started) * 1000),
                "error": error,
            }

    results = await asyncio.gather(*(compare_one(model) for model in unique_models))
    return {"results": results}


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language_code: str = Form(default="unknown"),
    translate_to_english: bool = Form(default=True),
) -> dict[str, str]:
    if not SARVAM_API_KEY:
        raise HTTPException(status_code=503, detail="Set SARVAM_API_KEY in backend/.env to use Saaras v4 voice input")
    if language_code != "unknown" and language_code not in SARVAM_LANGUAGE_CODES:
        raise HTTPException(status_code=422, detail="Choose a supported Indian language or English, or use auto detect")
    content, filename, content_type = await _read_audio(audio)
    try:
        transcript = await asyncio.to_thread(
            _sarvam_transcribe, content, filename, content_type,
            translate_to_english and language_code != "en-IN", language_code,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Saaras v4 transcription failed ({type(exc).__name__}); check the Sarvam API key, audio format, and account access") from None
    return {"model": "sarvam-saaras-v4", "transcript": transcript}


@router.post("/speak")
async def generate_speech(request: SpeechRequest) -> Response:
    api_key = _require_api_key()
    model = TTS_MODELS.get(request.model)
    if model is None:
        raise HTTPException(status_code=422, detail="Unsupported speech model")
    if request.voice not in model["voices"]:
        raise HTTPException(status_code=422, detail=f"Voice is not available for {request.model}")

    def create_audio() -> bytes:
        with OpenAI(api_key=api_key) as client:
            options = {
                "model": request.model,
                "voice": request.voice,
                "input": request.input,
                "response_format": request.response_format,
            }
            if model["instructions"] and request.instructions:
                options["instructions"] = request.instructions
            response = client.audio.speech.create(**options)
            return response.content

    started = time.perf_counter()
    try:
        audio_content = await asyncio.to_thread(create_audio)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Speech generation failed ({type(exc).__name__}); check model access and try again") from None
    content_type = "audio/mpeg" if request.response_format == "mp3" else "audio/wav"
    return Response(
        content=audio_content,
        media_type=content_type,
        headers={
            "X-Audio-Model": request.model,
            "X-Audio-Voice": request.voice,
            "X-Generation-Ms": str(round((time.perf_counter() - started) * 1000)),
            "Cache-Control": "no-store",
        },
    )
