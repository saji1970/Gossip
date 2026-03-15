from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.jobs.personality_update_job import start_scheduler, stop_scheduler
from backend.services.conversation_pipeline import analyze_message, process_voice
from backend.services.personality_engine import personality_engine
from backend.services.topic_service import topic_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Gossip AI backend")
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("Gossip AI backend stopped")


app = FastAPI(
    title="Gossip AI Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ──────────────────────────────────────


class MessageAnalyzeRequest(BaseModel):
    text: str
    group_id: str
    sender_id: str
    sender_name: Optional[str] = None


class ReplySuggestionsRequest(BaseModel):
    text: str
    emotion: str
    topic: str
    speaker_traits: dict = {}
    count: int = 5


class AnalysisResponse(BaseModel):
    speaker: str
    transcript: str
    emotion: str
    emotion_confidence: float
    sarcasm: bool
    topic: str
    topic_id: Optional[str]
    personality_traits: dict
    reply_suggestions: list


class PersonalityResponse(BaseModel):
    id: str
    name: Optional[str]
    conversation_count: int
    trait_scores: dict
    top_topics: dict
    emotion_distribution: dict
    speech_styles: list
    badge_traits: list


class TopicResponse(BaseModel):
    topic_id: str
    label: str
    message_count: int
    last_seen: float


# ── Endpoints ──────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/voice/process", response_model=AnalysisResponse)
async def voice_process(
    audio: UploadFile = File(...),
    group_id: str = Form(...),
    sender_id: Optional[str] = Form(None),
    sender_name: Optional[str] = Form(None),
):
    audio_bytes = await audio.read()
    result = await process_voice(
        audio_bytes=audio_bytes,
        group_id=group_id,
        sender_id=sender_id,
        sender_name=sender_name,
    )
    return AnalysisResponse(
        speaker=result.speaker,
        transcript=result.transcript,
        emotion=result.emotion,
        emotion_confidence=result.emotion_confidence,
        sarcasm=result.sarcasm,
        topic=result.topic,
        topic_id=result.topic_id,
        personality_traits=result.personality_traits,
        reply_suggestions=result.reply_suggestions,
    )


@app.post("/message/analyze", response_model=AnalysisResponse)
async def message_analyze(req: MessageAnalyzeRequest):
    result = await analyze_message(
        text=req.text,
        group_id=req.group_id,
        sender_id=req.sender_id,
        sender_name=req.sender_name,
    )
    return AnalysisResponse(
        speaker=result.speaker,
        transcript=result.transcript,
        emotion=result.emotion,
        emotion_confidence=result.emotion_confidence,
        sarcasm=result.sarcasm,
        topic=result.topic,
        topic_id=result.topic_id,
        personality_traits=result.personality_traits,
        reply_suggestions=result.reply_suggestions,
    )


@app.get("/personality/{user_id}", response_model=PersonalityResponse)
async def get_personality(user_id: str):
    profile = personality_engine.get_profile(user_id)
    if profile is None:
        return PersonalityResponse(
            id=user_id,
            name=None,
            conversation_count=0,
            trait_scores={},
            top_topics={},
            emotion_distribution={},
            speech_styles=[],
            badge_traits=[],
        )

    badge_traits = personality_engine.get_badge_traits(user_id)

    return PersonalityResponse(
        id=profile.id,
        name=profile.name,
        conversation_count=profile.conversation_count,
        trait_scores=profile.trait_scores,
        top_topics=profile.top_topics,
        emotion_distribution=profile.emotion_distribution,
        speech_styles=profile.speech_styles,
        badge_traits=badge_traits,
    )


@app.get("/topics/trending", response_model=list[TopicResponse])
async def trending_topics(limit: int = 10):
    topics = topic_service.get_trending_topics(limit=limit)
    return [
        TopicResponse(
            topic_id=t["topic_id"],
            label=t["label"],
            message_count=t["message_count"],
            last_seen=t["last_seen"],
        )
        for t in topics
    ]


@app.post("/reply/suggestions")
async def reply_suggestions(req: ReplySuggestionsRequest):
    from backend.services.reply_service import generate_reply_suggestions

    suggestions = await generate_reply_suggestions(
        text=req.text,
        emotion=req.emotion,
        topic=req.topic,
        speaker_traits=req.speaker_traits,
        count=req.count,
    )
    return {"suggestions": suggestions}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )
