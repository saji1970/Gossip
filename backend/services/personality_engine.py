from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional

from backend.config import PERSONALITY_TRAITS, TRAIT_BADGE_THRESHOLD
from backend.models.speaker_profile import SpeakerProfile

logger = logging.getLogger(__name__)

SIGNAL_WEIGHTS = {
    "emotion": {
        "sarcastic": {"sarcasm": 0.8},
        "dramatic": {"excitement": 0.5, "anger": 0.6, "surprise": 0.3},
        "curious": {"curiosity": 0.7},
        "supportive": {"excitement": 0.2},
        "skeptical": {"anger": 0.2},
    },
    "intent": {
        "curious": {"question": 0.6},
        "secretive": {"gossip": 0.7},
        "supportive": {"greeting": 0.2},
    },
    "message_length": {
        "dramatic": {"long": 0.3},
        "curious": {"short_question": 0.2},
    },
}

SUPPORTIVE_PATTERNS = [
    "hope",
    "care",
    "love you",
    "proud",
    "great job",
    "you got this",
    "don't worry",
    "here for you",
    "support",
    "believe in",
]

SKEPTICAL_PATTERNS = [
    "doubt",
    "don't think",
    "unlikely",
    "not sure about",
    "really?",
    "hard to believe",
    "suspicious",
    "don't trust",
    "seems fake",
    "don't buy",
]


class PersonalityEngine:
    def __init__(self) -> None:
        self._profiles: Dict[str, SpeakerProfile] = {}

    def update_trait_score(
        self,
        profile: SpeakerProfile,
        trait: str,
        signal_weight: float,
    ) -> float:
        current = profile.trait_scores.get(trait, 0.0)
        updated = current * 0.9 + signal_weight * 0.1
        profile.trait_scores[trait] = updated
        return updated

    def analyze_signals(
        self,
        profile: SpeakerProfile,
        emotion: str,
        sarcasm: bool,
        intent: str,
        text: str,
        topic_category: str,
    ) -> Dict[str, float]:
        text_lower = text.lower()
        msg_len = len(text)

        # Sarcasm signal
        if sarcasm:
            self.update_trait_score(profile, "sarcastic", 1.0)
        else:
            self.update_trait_score(profile, "sarcastic", 0.0)

        # Emotion-based signals
        emotion_weights = SIGNAL_WEIGHTS["emotion"]
        for trait, emotion_map in emotion_weights.items():
            weight = emotion_map.get(emotion, 0.0)
            if weight > 0:
                self.update_trait_score(profile, trait, weight)

        # Intent-based signals
        intent_weights = SIGNAL_WEIGHTS["intent"]
        for trait, intent_map in intent_weights.items():
            weight = intent_map.get(intent, 0.0)
            if weight > 0:
                self.update_trait_score(profile, trait, weight)

        # Curious from questions
        if intent == "question":
            self.update_trait_score(profile, "curious", 0.8)
        else:
            self.update_trait_score(profile, "curious", 0.0)

        # Dramatic from long emotional messages
        if msg_len > 100 and emotion in ("excitement", "anger", "surprise"):
            self.update_trait_score(profile, "dramatic", 0.9)
        elif emotion in ("excitement", "anger"):
            self.update_trait_score(profile, "dramatic", 0.5)
        else:
            self.update_trait_score(profile, "dramatic", 0.0)

        # Supportive from keyword matching
        supportive_hits = sum(
            1 for p in SUPPORTIVE_PATTERNS if p in text_lower
        )
        if supportive_hits > 0:
            weight = min(supportive_hits * 0.3, 1.0)
            self.update_trait_score(profile, "supportive", weight)
        else:
            self.update_trait_score(profile, "supportive", 0.0)

        # Secretive from gossip intent/topic
        if intent == "gossip" or topic_category == "gossip_tea":
            self.update_trait_score(profile, "secretive", 0.8)
        else:
            self.update_trait_score(profile, "secretive", 0.0)

        # Skeptical from patterns
        skeptical_hits = sum(
            1 for p in SKEPTICAL_PATTERNS if p in text_lower
        )
        if skeptical_hits > 0:
            weight = min(skeptical_hits * 0.3, 1.0)
            self.update_trait_score(profile, "skeptical", weight)
        else:
            self.update_trait_score(profile, "skeptical", 0.0)

        # Update emotion distribution
        total = profile.conversation_count or 1
        for emo_key in profile.emotion_distribution:
            current = profile.emotion_distribution[emo_key]
            detected = 1.0 if emo_key == emotion else 0.0
            profile.emotion_distribution[emo_key] = (
                current + (detected - current) / total
            )

        # Update topics
        profile.top_topics[topic_category] = (
            profile.top_topics.get(topic_category, 0) + 1
        )

        # Increment conversation count
        profile.conversation_count += 1
        profile.updated_at = time.time()

        return dict(profile.trait_scores)

    def get_or_create_profile(
        self, speaker_id: str, name: Optional[str] = None
    ) -> SpeakerProfile:
        if speaker_id not in self._profiles:
            self._profiles[speaker_id] = SpeakerProfile(
                id=speaker_id, name=name
            )
        return self._profiles[speaker_id]

    def get_profile(self, speaker_id: str) -> Optional[SpeakerProfile]:
        return self._profiles.get(speaker_id)

    def get_all_profiles(self) -> List[SpeakerProfile]:
        return list(self._profiles.values())

    def get_badge_traits(self, speaker_id: str) -> List[str]:
        profile = self._profiles.get(speaker_id)
        if profile is None:
            return []
        return [
            trait
            for trait, score in profile.trait_scores.items()
            if score >= TRAIT_BADGE_THRESHOLD
        ]

    def recompute_from_history(
        self, speaker_id: str, messages: List[Dict]
    ) -> Optional[SpeakerProfile]:
        profile = self._profiles.get(speaker_id)
        if profile is None:
            return None

        profile.trait_scores = {t: 0.0 for t in PERSONALITY_TRAITS}
        profile.emotion_distribution = {
            "sarcasm": 0.0,
            "excitement": 0.0,
            "anger": 0.0,
            "curiosity": 0.0,
            "amusement": 0.0,
            "surprise": 0.0,
        }
        profile.top_topics = {}
        profile.conversation_count = 0

        for msg in messages:
            self.analyze_signals(
                profile=profile,
                emotion=msg.get("emotion", "excitement"),
                sarcasm=msg.get("emotion") == "sarcasm",
                intent=msg.get("intent", "statement"),
                text=msg.get("text", ""),
                topic_category=msg.get("topic", "general"),
            )

        profile.updated_at = time.time()
        self._profiles[speaker_id] = profile
        return profile


personality_engine = PersonalityEngine()
