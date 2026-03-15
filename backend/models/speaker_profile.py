from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import time
import uuid


class SpeakerProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    voice_embedding: List[float] = Field(default_factory=list)
    name: Optional[str] = None
    conversation_count: int = 0
    trait_scores: Dict[str, float] = Field(default_factory=lambda: {
        "sarcastic": 0.0,
        "dramatic": 0.0,
        "curious": 0.0,
        "supportive": 0.0,
        "secretive": 0.0,
        "skeptical": 0.0,
    })
    top_topics: Dict[str, int] = Field(default_factory=dict)
    emotion_distribution: Dict[str, float] = Field(default_factory=lambda: {
        "sarcasm": 0.0,
        "excitement": 0.0,
        "anger": 0.0,
        "curiosity": 0.0,
        "amusement": 0.0,
        "surprise": 0.0,
    })
    speech_styles: List[str] = Field(default_factory=list)
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)


class MessageRecord(BaseModel):
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    sender_id: str
    text: str
    timestamp: float = Field(default_factory=time.time)
    emotion: str = "neutral"
    topic: str = "general"
    personality_traits_detected: Dict[str, float] = Field(default_factory=dict)
    embedding: List[float] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    speaker: str
    transcript: str
    emotion: str
    emotion_confidence: float = 0.0
    sarcasm: bool = False
    topic: str
    topic_id: Optional[str] = None
    personality_traits: Dict[str, float] = Field(default_factory=dict)
    reply_suggestions: List[str] = Field(default_factory=list)


class TopicCluster(BaseModel):
    topic_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    centroid: List[float] = Field(default_factory=list)
    message_count: int = 1
    last_seen: float = Field(default_factory=time.time)
