from __future__ import annotations

import logging
import os
import tempfile
from typing import Optional

from backend.config import (
    WHISPER_COMPUTE_TYPE,
    WHISPER_DEVICE,
    WHISPER_MODEL_SIZE,
)

logger = logging.getLogger(__name__)

_whisper_model = None
_model_available = True


def _get_model():
    global _whisper_model, _model_available
    if _whisper_model is not None:
        return _whisper_model
    if not _model_available:
        return None
    try:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
        logger.info(
            "Loaded Whisper model: size=%s device=%s",
            WHISPER_MODEL_SIZE,
            WHISPER_DEVICE,
        )
        return _whisper_model
    except Exception as exc:
        logger.error("Failed to load Whisper model: %s", exc)
        _model_available = False
        return None


def transcribe_audio(audio_path: str) -> str:
    model = _get_model()
    if model is None:
        logger.error("Whisper model not available")
        return ""

    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        language="en",
        vad_filter=True,
    )

    transcript_parts = []
    for segment in segments:
        transcript_parts.append(segment.text.strip())

    transcript = " ".join(transcript_parts)
    logger.info(
        "Transcribed %.1fs audio → %d chars",
        info.duration,
        len(transcript),
    )
    return transcript


def transcribe_audio_bytes(
    audio_bytes: bytes, suffix: str = ".wav"
) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        tmp.write(audio_bytes)
        tmp.flush()
        tmp.close()
        return transcribe_audio(tmp.name)
    finally:
        os.unlink(tmp.name)
