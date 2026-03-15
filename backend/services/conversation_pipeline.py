from __future__ import annotations

import logging
import time
import uuid
from typing import Dict, List, Optional

from backend.models.speaker_profile import AnalysisResult
from backend.services.emotion_service import detect_emotion
from backend.services.memory_service import memory_service
from backend.services.personality_engine import personality_engine
from backend.services.reply_service import generate_reply_suggestions
from backend.services.speaker_service import speaker_service
from backend.services.topic_service import topic_service
from backend.services.transcription_service import (
    transcribe_audio,
    transcribe_audio_bytes,
)

logger = logging.getLogger(__name__)


def _detect_intent(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in ("hi", "hey", "hello", "sup", "yo")):
        return "greeting"
    if "?" in text:
        return "question"
    if any(
        w in lower
        for w in (
            "heard",
            "apparently",
            "did you know",
            "rumor",
            "secret",
            "tea",
            "drama",
        )
    ):
        return "gossip"
    return "statement"


async def process_voice(
    audio_bytes: bytes,
    group_id: str,
    sender_id: Optional[str] = None,
    sender_name: Optional[str] = None,
) -> AnalysisResult:
    # 1. Transcribe
    transcript = transcribe_audio_bytes(audio_bytes)
    if not transcript:
        return AnalysisResult(
            speaker=sender_id or "unknown",
            transcript="",
            emotion="excitement",
            topic="general",
            reply_suggestions=[],
        )

    # 2. Speaker detection
    voice_embedding = speaker_service.generate_embedding_from_bytes(audio_bytes)
    if sender_id:
        profile = personality_engine.get_or_create_profile(
            sender_id, name=sender_name
        )
    elif voice_embedding:
        sp = speaker_service.get_or_create_speaker(
            voice_embedding, fallback_name=sender_name or "Unknown"
        )
        sender_id = sp.id
        profile = personality_engine.get_or_create_profile(
            sp.id, name=sp.name
        )
    else:
        sender_id = sender_id or str(uuid.uuid4())
        profile = personality_engine.get_or_create_profile(
            sender_id, name=sender_name
        )

    # 3-6. Analyze text
    result = await analyze_message(
        text=transcript,
        group_id=group_id,
        sender_id=sender_id,
        sender_name=sender_name,
    )
    return result


async def analyze_message(
    text: str,
    group_id: str,
    sender_id: str,
    sender_name: Optional[str] = None,
) -> AnalysisResult:
    # 3. Emotion detection
    emotion_result = detect_emotion(text)
    emotion = emotion_result["emotion"]
    confidence = emotion_result["confidence"]
    sarcasm = emotion_result["sarcasm"]

    # 4. Topic detection
    topic_result = topic_service.detect_topic(text)
    topic_label = topic_result["topic"]
    topic_category = topic_result["category"]
    topic_embedding = topic_result.get("embedding")

    topic_id, _ = topic_service.cluster_topic(text, embedding=topic_embedding)

    # 5. Personality update
    intent = _detect_intent(text)
    profile = personality_engine.get_or_create_profile(
        sender_id, name=sender_name
    )
    trait_scores = personality_engine.analyze_signals(
        profile=profile,
        emotion=emotion,
        sarcasm=sarcasm,
        intent=intent,
        text=text,
        topic_category=topic_category,
    )

    # 6. Memory storage
    message_id = str(uuid.uuid4())
    try:
        memory_service.store_message_embedding(
            message_id=message_id,
            text=text,
            group_id=group_id,
            sender_id=sender_id,
            timestamp=time.time(),
            emotion=emotion,
            topic=topic_category,
            personality_traits_detected=trait_scores,
        )
    except Exception as exc:
        logger.error("Failed to store message embedding: %s", exc)

    # 7. Reply suggestions
    suggestions = await generate_reply_suggestions(
        text=text,
        emotion=emotion,
        topic=topic_label,
        speaker_traits=trait_scores,
        count=5,
    )

    return AnalysisResult(
        speaker=sender_id,
        transcript=text,
        emotion=emotion,
        emotion_confidence=confidence,
        sarcasm=sarcasm,
        topic=topic_label,
        topic_id=topic_id,
        personality_traits=trait_scores,
        reply_suggestions=suggestions,
    )
