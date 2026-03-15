from __future__ import annotations

import logging
import re
from typing import Dict

from backend.config import EMOTION_MODEL

logger = logging.getLogger(__name__)

_classifier = None
_model_available = True

MODEL_TO_APP_EMOTION = {
    "joy": "excitement",
    "anger": "anger",
    "surprise": "surprise",
    "sadness": "anger",
    "fear": "surprise",
    "love": "excitement",
}

SARCASM_PATTERNS = [
    re.compile(r"yeah right", re.I),
    re.compile(r"\btotally\b", re.I),
    re.compile(r"\bsure\b(?!\s+thing)", re.I),
    re.compile(r"of course", re.I),
    re.compile(r"\*[^*]+\*"),
    re.compile(r"obviously", re.I),
    re.compile(r"wow really", re.I),
    re.compile(r"no kidding", re.I),
    re.compile(r"what a surprise", re.I),
    re.compile(r"how shocking", re.I),
]

CURIOSITY_PATTERNS = [
    re.compile(r"\?{1,}"),
    re.compile(r"\bwhy\b", re.I),
    re.compile(r"\bhow\b", re.I),
    re.compile(r"what happened", re.I),
    re.compile(r"tell me", re.I),
    re.compile(r"I wonder", re.I),
]

AMUSEMENT_PATTERNS = [
    re.compile(r"\blol\b", re.I),
    re.compile(r"\blmao\b", re.I),
    re.compile(r"haha", re.I),
    re.compile(r"\bdead\b", re.I),
    re.compile(r"hilarious", re.I),
    re.compile(r"dying", re.I),
]


def _get_classifier():
    global _classifier, _model_available
    if _classifier is not None:
        return _classifier
    if not _model_available:
        return None
    try:
        from transformers import pipeline

        _classifier = pipeline(
            "text-classification",
            model=EMOTION_MODEL,
            top_k=3,
            truncation=True,
        )
        logger.info("Loaded emotion model %s", EMOTION_MODEL)
        return _classifier
    except Exception as exc:
        logger.warning("Could not load emotion model: %s; using fallback", exc)
        _model_available = False
        return None


def _count_matches(text: str, patterns: list) -> int:
    return sum(1 for p in patterns if p.search(text))


def _detect_sarcasm(text: str) -> bool:
    return _count_matches(text, SARCASM_PATTERNS) >= 1


def _regex_fallback(text: str) -> Dict:
    sarcasm = _detect_sarcasm(text)
    if sarcasm:
        return {"emotion": "sarcasm", "confidence": 0.7, "sarcasm": True}

    curiosity = _count_matches(text, CURIOSITY_PATTERNS)
    amusement = _count_matches(text, AMUSEMENT_PATTERNS)

    has_caps = len(re.findall(r"\b[A-Z]{2,}\b", text)) >= 2
    has_exclaim = bool(re.search(r"!{2,}", text))
    has_anger = bool(
        re.search(r"\b(hate|angry|furious|can't stand|sick of)\b", text, re.I)
    )
    has_surprise = bool(
        re.search(r"(no way|what\?!|seriously\?|wait what)", text, re.I)
    )
    has_excitement = bool(
        re.search(r"(omg|amazing|can't believe|awesome|so excited)", text, re.I)
    )

    scores = {
        "curiosity": curiosity,
        "amusement": amusement,
        "anger": (2 if has_anger else 0) + (2 if has_caps else 0),
        "surprise": 2 if has_surprise else 0,
        "excitement": (2 if has_excitement else 0) + (1 if has_exclaim else 0),
    }

    best = max(scores, key=scores.get)
    best_score = scores[best]
    if best_score == 0:
        return {"emotion": "excitement", "confidence": 0.3, "sarcasm": False}

    confidence = min(0.4 + (best_score / 4) * 0.5, 0.9)
    return {"emotion": best, "confidence": confidence, "sarcasm": False}


def detect_emotion(text: str) -> Dict:
    sarcasm = _detect_sarcasm(text)

    classifier = _get_classifier()
    if classifier is None:
        result = _regex_fallback(text)
        result["sarcasm"] = result["sarcasm"] or sarcasm
        if sarcasm:
            result["emotion"] = "sarcasm"
        return result

    try:
        predictions = classifier(text[:512])
        if isinstance(predictions, list) and isinstance(predictions[0], list):
            predictions = predictions[0]

        top = predictions[0]
        model_label = top["label"].lower()
        confidence = float(top["score"])

        mapped_emotion = MODEL_TO_APP_EMOTION.get(model_label, None)

        if mapped_emotion is None:
            amusement_count = _count_matches(text, AMUSEMENT_PATTERNS)
            curiosity_count = _count_matches(text, CURIOSITY_PATTERNS)
            if amusement_count > curiosity_count:
                mapped_emotion = "amusement"
            elif curiosity_count > 0:
                mapped_emotion = "curiosity"
            else:
                mapped_emotion = "excitement"

        if sarcasm:
            mapped_emotion = "sarcasm"
            confidence = max(confidence, 0.65)

        return {
            "emotion": mapped_emotion,
            "confidence": confidence,
            "sarcasm": sarcasm,
        }

    except Exception as exc:
        logger.error("Emotion model inference failed: %s", exc)
        result = _regex_fallback(text)
        result["sarcasm"] = result["sarcasm"] or sarcasm
        if sarcasm:
            result["emotion"] = "sarcasm"
        return result
