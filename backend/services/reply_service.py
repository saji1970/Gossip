from __future__ import annotations

import logging
import random
from typing import Dict, List, Optional

import httpx

from backend.config import OLLAMA_HOST, OLLAMA_MODEL
from backend.models.speaker_profile import SpeakerProfile

logger = logging.getLogger(__name__)

SARCASM_REPLIES = [
    "Of course he did",
    "Classic",
    "I knew it",
    "Shocking",
    "Who could have seen that coming",
    "Sure, totally believable",
    "What a plot twist",
]

EMOTIONAL_REPLIES = [
    "That's awful",
    "Are you okay?",
    "I'm here for you",
    "That's rough",
    "What happened?",
    "I'm sorry to hear that",
]

GOSSIP_REPLIES = [
    "What happened?",
    "Tell me everything",
    "No way",
    "Spill the tea",
    "Are you serious?",
    "I need details",
    "Wait, what??",
]

QUESTION_REPLIES = [
    "Yes",
    "I think so",
    "Not sure",
    "Definitely",
    "Maybe",
    "Good question",
]

GREETING_REPLIES = [
    "Hey!",
    "What's up?",
    "How are you?",
    "Yo!",
    "Hey there!",
]

EXCITEMENT_REPLIES = [
    "That's amazing!",
    "No way!!",
    "Let's go!",
    "So hyped",
    "That's incredible!",
]

SURPRISE_REPLIES = [
    "Wait what??",
    "Are you kidding?",
    "No way",
    "Seriously?!",
    "I can't believe it",
]

NEUTRAL_REPLIES = [
    "Interesting",
    "Got it",
    "Makes sense",
    "I see",
    "Fair enough",
]

HUMOR_ADDITIONS = [
    "lol",
    "I'm dead",
    "Can't make this up",
    "You're joking right",
    "This is gold",
]


def _pick_random(pool: List[str], count: int) -> List[str]:
    shuffled = random.sample(pool, min(count, len(pool)))
    return shuffled


def _detect_intent(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in ("hi", "hey", "hello", "sup", "yo")):
        return "greeting"
    if "?" in text:
        return "question"
    if any(
        w in lower
        for w in ("heard", "apparently", "did you know", "rumor", "secret", "tea", "drama")
    ):
        return "gossip"
    return "statement"


def _static_suggestions(
    text: str,
    emotion: str,
    sarcasm: bool,
    speaker_traits: Dict[str, float],
    count: int = 5,
) -> List[str]:
    intent = _detect_intent(text)

    if sarcasm:
        base = _pick_random(SARCASM_REPLIES, count)
    elif emotion == "anger":
        base = _pick_random(EMOTIONAL_REPLIES, count)
    elif emotion == "excitement":
        base = _pick_random(EXCITEMENT_REPLIES, count)
    elif emotion == "surprise":
        base = _pick_random(SURPRISE_REPLIES, count)
    elif emotion == "amusement":
        base = _pick_random(SARCASM_REPLIES, 2) + _pick_random(EXCITEMENT_REPLIES, count - 2)
    elif intent == "greeting":
        base = _pick_random(GREETING_REPLIES, count)
    elif intent == "question":
        base = _pick_random(QUESTION_REPLIES, count)
    elif intent == "gossip":
        base = _pick_random(GOSSIP_REPLIES, count)
    else:
        base = _pick_random(NEUTRAL_REPLIES, count)

    is_sarcastic_speaker = speaker_traits.get("sarcastic", 0) >= 0.5
    if is_sarcastic_speaker and not sarcasm:
        humor = _pick_random(HUMOR_ADDITIONS, 1)
        if len(base) >= count:
            base[-1] = humor[0]
        else:
            base.append(humor[0])

    return base[:count]


async def _llm_suggestions(
    text: str,
    emotion: str,
    topic: str,
    speaker_traits: Dict[str, float],
    count: int = 5,
) -> Optional[List[str]]:
    trait_desc = ", ".join(
        f"{t} ({s:.0%})"
        for t, s in sorted(speaker_traits.items(), key=lambda x: -x[1])[:3]
        if s > 0.2
    )

    prompt = (
        f"The speaker's personality traits: {trait_desc or 'unknown'}.\n"
        f"They just said (emotion={emotion}, topic={topic}): \"{text}\"\n\n"
        f"Generate exactly {count} short reply suggestions (1-6 words each) "
        f"that match the conversational context. If the speaker is sarcastic, "
        f"include witty replies. Output only the replies, one per line, no numbering."
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.8, "num_predict": 100},
                },
            )
            resp.raise_for_status()
            body = resp.json()
            raw = body.get("response", "")
            lines = [
                ln.strip().lstrip("0123456789.-) ")
                for ln in raw.strip().split("\n")
                if ln.strip()
            ]
            lines = [ln for ln in lines if 1 < len(ln) < 60]
            if len(lines) >= 3:
                return lines[:count]
    except Exception as exc:
        logger.warning("LLM suggestion call failed: %s", exc)

    return None


async def generate_reply_suggestions(
    text: str,
    emotion: str,
    topic: str,
    speaker_traits: Dict[str, float],
    count: int = 5,
) -> List[str]:
    llm_result = await _llm_suggestions(
        text, emotion, topic, speaker_traits, count
    )
    if llm_result:
        return llm_result

    return _static_suggestions(
        text,
        emotion,
        sarcasm=emotion == "sarcasm",
        speaker_traits=speaker_traits,
        count=count,
    )
