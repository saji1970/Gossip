"""
3-tier NLP intent classification service.

Tier 1 (LLM): Ollama with structured prompt — best quality, local dev only
Tier 2 (Embeddings): Sentence-Transformers cosine similarity — fast, works on Railway
Tier 3 (Regex): Port of mobile IntentResolver keyword clusters — offline fallback
"""

import asyncio
import logging
import re
import time
from typing import Optional

import httpx
import numpy as np

from backend.config import (
    EMBEDDING_MODEL,
    INTENT_LLM_TEMPERATURE,
    INTENT_LLM_TIMEOUT,
    OLLAMA_HOST,
    OLLAMA_MODEL,
)

logger = logging.getLogger(__name__)

# ── Intent definitions ────────────────────────────────────────────

VALID_INTENTS = [
    "chat_with_person",
    "private_chat",
    "create_group",
    "call_group",
    "send_message",
    "add_member",
    "query_groups",
    "query_members",
    "navigate",
    "help",
    "casual_chat",
    "show_groups",
    "settings_change",
]

# ── Tier 2: Canonical intent phrases for embedding similarity ─────

CANONICAL_PHRASES: dict[str, list[str]] = {
    "chat_with_person": [
        "chat with someone",
        "talk to a person",
        "open chat with friend",
        "speak to someone",
        "message a person",
        "text someone",
        "hit them up",
        "connect with a friend",
    ],
    "private_chat": [
        "private chat with someone",
        "direct message a person",
        "dm someone",
        "slide into dms",
        "send a private message",
    ],
    "create_group": [
        "create a new group",
        "make a group",
        "start a new group chat",
        "set up a group",
    ],
    "call_group": [
        "call a group",
        "start a voice call",
        "make a call",
        "hop on a call",
        "start a video call",
        "link up on a call",
    ],
    "send_message": [
        "send a message",
        "send something to a group",
        "drop a message",
        "tell them something",
        "say something in a group",
        "post a message",
    ],
    "query_groups": [
        "what groups is someone in",
        "which groups does a person belong to",
        "find groups for someone",
        "list groups for a person",
    ],
    "query_members": [
        "who is in a group",
        "list members of a group",
        "show group members",
        "who belongs to this group",
    ],
    "navigate": [
        "go to a screen",
        "open settings",
        "switch to home",
        "navigate to a page",
        "take me to settings",
    ],
    "help": [
        "help me",
        "what can you do",
        "how does this work",
        "show me commands",
    ],
    "show_groups": [
        "show my groups",
        "list my groups",
        "what are my groups",
        "show all groups",
    ],
    "settings_change": [
        "change my name",
        "change theme",
        "log out",
        "sign out",
        "enable dark mode",
        "edit my profile",
        "switch to light mode",
    ],
    "add_member": [
        "add someone to a group",
        "invite a person to a group",
        "add a member",
        "invite someone",
        "add them to the group",
        "send an invite",
    ],
    "casual_chat": [
        "hi there",
        "how are you",
        "good morning",
        "thanks",
        "lol",
        "okay cool",
        "sounds good",
        "bye",
    ],
}

# ── Tier 3: Regex keyword clusters (port of mobile IntentResolver) ─

KEYWORD_CLUSTERS: dict[str, list[list[str]]] = {
    "private_chat": [
        ["private", "chat"], ["direct", "message"], ["slide", "dms"],
        ["dm", "with"], ["dm", "to"],
    ],
    "chat_with_person": [
        ["chat", "with"], ["talk", "to"], ["talk", "with"],
        ["speak", "to"], ["speak", "with"], ["message", "to"],
        ["text", "to"], ["connect", "with"], ["hit", "up"],
    ],
    "create_group": [
        ["create", "group"], ["new", "group"], ["make", "group"], ["start", "group"],
    ],
    "call_group": [
        ["voice", "call"], ["video", "call"], ["start", "call"],
        ["make", "call"], ["call", "group"], ["call", "the"],
        ["hop", "on", "call"], ["link", "up"],
    ],
    "send_message": [
        ["send", "message"], ["send", "to"], ["send", "in"],
    ],
    "query_groups": [
        ["what", "groups"], ["which", "groups"], ["groups", "in"], ["list", "groups"],
    ],
    "query_members": [
        ["who", "in"], ["members", "of"], ["who", "is", "in"], ["list", "members"],
    ],
    "navigate": [
        ["go", "to"], ["switch", "to"], ["open", "the"], ["take", "me", "to"], ["navigate", "to"],
    ],
    "help": [
        ["help"], ["help", "me"], ["need", "help"],
        ["what", "can", "you", "do"], ["how", "does", "this", "work"],
    ],
    "show_groups": [
        ["my", "groups"], ["show", "groups"], ["list", "groups"], ["all", "groups"],
    ],
    "settings_change": [
        ["change", "name"], ["change", "theme"], ["log", "out"],
        ["sign", "out"], ["dark", "mode"], ["edit", "profile"], ["light", "mode"],
    ],
    "add_member": [
        ["add", "member"], ["add", "to", "group"], ["invite", "to"],
        ["invite", "member"], ["add", "them"], ["send", "invite"],
        ["add", "to", "the"], ["invite", "to", "group"],
    ],
    "casual_chat": [
        ["how", "are", "you"], ["what", "up"], ["hey", "gossip"],
        ["good", "morning"], ["good", "night"],
    ],
}

STOP_WORDS = {
    "me", "you", "him", "her", "them", "us", "it", "that", "this",
    "something", "anything", "everything", "everyone", "someone", "nobody",
    "there", "here", "now", "then", "today", "tomorrow",
    "the", "a", "an", "my", "your", "our", "their",
    "do", "does", "did", "doing", "done",
    "is", "are", "was", "were", "be", "been",
    "have", "has", "had",
    "will", "would", "could", "should", "can", "may", "might",
    "not", "no", "yes", "so", "too", "also",
    "just", "really", "very", "much", "more", "less",
    "about", "like", "know", "think", "want", "need",
    "good", "bad", "great", "fine", "well", "go", "get",
}


# ── Embedding model (lazy loaded) ────────────────────────────────

_embedding_model = None
_canonical_embeddings: dict[str, np.ndarray] = {}


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
            logger.info("Loaded embedding model: %s", EMBEDDING_MODEL)
        except Exception as exc:
            logger.warning("Failed to load embedding model: %s", exc)
    return _embedding_model


def _precompute_canonical_embeddings():
    """Pre-compute embeddings for all canonical phrases."""
    global _canonical_embeddings
    if _canonical_embeddings:
        return
    model = _get_embedding_model()
    if model is None:
        return
    for intent, phrases in CANONICAL_PHRASES.items():
        embeddings = model.encode(phrases, convert_to_numpy=True)
        # Store the mean embedding for each intent
        _canonical_embeddings[intent] = np.mean(embeddings, axis=0)
    logger.info("Pre-computed canonical embeddings for %d intents", len(_canonical_embeddings))


# ── Tier 1: LLM Classification ──────────────────────────────────

def _build_llm_prompt(
    text: str,
    group_names: list[str],
    member_names: list[str],
    current_screen: str,
) -> str:
    groups_str = ", ".join(group_names) if group_names else "none"
    members_str = ", ".join(member_names) if member_names else "none"

    return f"""You are an intent classifier for a chat app called Gossip. Classify the user's message into exactly one intent and extract entities.

Available intents:
- chat_with_person: User wants to open a chat with someone
- private_chat: User wants to DM someone privately
- create_group: User wants to create a new group
- call_group: User wants to start a voice/video call
- send_message: User wants to send a message to a group
- add_member: User wants to add/invite someone to a group
- query_groups: User asks what groups someone is in
- query_members: User asks who is in a group
- navigate: User wants to go to a screen
- help: User asks for help
- show_groups: User wants to see their groups
- settings_change: User wants to change settings, theme, profile, or logout
- casual_chat: Greetings, thanks, reactions, small talk

Entity types: person, group, message, screen, email, privacy, approval

For create_group: extract group name as "group", "private"/"public" as "privacy", "approval required"/"need to be approved" as "approval" (value "true" or "false").
For add_member: extract person name as "person", email as "email", target group as "group".

User's groups: {groups_str}
Known members: {members_str}
Current screen: {current_screen}

User said: "{text}"

Respond with ONLY valid JSON (no markdown, no explanation):
{{"intent": "<intent>", "entities": [{{"type": "<type>", "value": "<value>"}}], "confidence": <0.0-1.0>}}"""


async def _classify_with_llm(
    text: str,
    group_names: list[str],
    member_names: list[str],
    current_screen: str,
) -> Optional[dict]:
    """Tier 1: Use Ollama LLM for classification."""
    prompt = _build_llm_prompt(text, group_names, member_names, current_screen)

    try:
        async with httpx.AsyncClient(timeout=INTENT_LLM_TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": INTENT_LLM_TEMPERATURE,
                        "num_predict": 200,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            raw = data.get("response", "").strip()

            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if not json_match:
                logger.warning("LLM returned no JSON: %s", raw[:200])
                return None

            import json
            result = json.loads(json_match.group())

            intent = result.get("intent", "unknown")
            if intent not in VALID_INTENTS:
                intent = "unknown"

            entities = result.get("entities", [])
            confidence = float(result.get("confidence", 0.5))

            return {
                "intent": intent,
                "entities": entities,
                "confidence": confidence,
                "tier": "llm",
            }
    except httpx.TimeoutException:
        logger.info("LLM classification timed out after %ss", INTENT_LLM_TIMEOUT)
        return None
    except Exception as exc:
        logger.info("LLM classification failed: %s", exc)
        return None


# ── Tier 2: Embedding Classification ────────────────────────────

def _classify_with_embeddings(text: str) -> Optional[dict]:
    """Tier 2: Use sentence-transformers cosine similarity."""
    _precompute_canonical_embeddings()
    model = _get_embedding_model()
    if model is None or not _canonical_embeddings:
        return None

    try:
        text_embedding = model.encode([text], convert_to_numpy=True)[0]

        best_intent = "unknown"
        best_score = 0.0

        for intent, canonical_emb in _canonical_embeddings.items():
            # Cosine similarity
            score = float(np.dot(text_embedding, canonical_emb) / (
                np.linalg.norm(text_embedding) * np.linalg.norm(canonical_emb)
            ))
            if score > best_score:
                best_score = score
                best_intent = intent

        if best_score < 0.3:
            return None

        # Extract entities with regex (same as Tier 3)
        entities = _extract_entities_regex(text, best_intent)

        return {
            "intent": best_intent,
            "entities": entities,
            "confidence": round(best_score, 3),
            "tier": "embedding",
        }
    except Exception as exc:
        logger.warning("Embedding classification failed: %s", exc)
        return None


# ── Tier 3: Regex Classification ─────────────────────────────────

def _score_cluster(words: list[str], cluster: list[str]) -> float:
    matched = sum(1 for kw in cluster if kw in words)
    if matched == 0:
        return 0.0
    if len(cluster) <= 2 and matched < len(cluster):
        return 0.0
    return matched / len(cluster)


def _classify_with_regex(text: str) -> dict:
    """Tier 3: Keyword cluster matching (always available)."""
    lower = text.lower().strip()
    words = lower.split()
    # Expand contractions
    expanded = list(words)
    for w in words:
        base = re.sub(r"'s$|'t$|'m$|'re$|'ve$|'ll$|'d$", "", w)
        if base != w and base:
            expanded.append(base)

    best_intent = "unknown"
    best_score = 0.0

    for intent, clusters in KEYWORD_CLUSTERS.items():
        for cluster in clusters:
            score = _score_cluster(expanded, cluster)
            if score > best_score:
                best_score = score
                best_intent = intent

    # Single-word casual matches
    if best_score == 0 and lower in {
        "hi", "hello", "hey", "yo", "sup", "bye", "thanks", "lol",
        "ok", "okay", "sure", "yeah", "yep", "cool", "nice", "great",
        "perfect", "awesome", "amazing", "sweet", "wow", "hmm",
        "nope", "nah", "whatever", "nothing", "maybe",
    }:
        best_intent = "casual_chat"
        best_score = 0.8

    entities = _extract_entities_regex(text, best_intent) if best_intent != "unknown" else []

    return {
        "intent": best_intent,
        "entities": entities,
        "confidence": round(best_score, 3),
        "tier": "regex",
    }


def _extract_entities_regex(text: str, intent: str) -> list[dict]:
    """Extract entities using regex patterns."""
    entities = []
    lower = text.lower()

    # Email address (globally useful)
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', text)
    if email_match:
        entities.append({"type": "email", "value": email_match.group()})

    # Person name
    person_match = re.search(
        r'(?:with|to|up|dm|message|text|chat|contact|reach|add|invite)\s+'
        r'([a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*)?)(?:\s+(?:in|from|on|privately|private|saying|and|to|his|her|their|email)|\s*$)',
        lower,
    )
    if person_match and intent in ("chat_with_person", "private_chat", "query_groups", "add_member"):
        name = person_match.group(1).strip()
        if name.lower() not in STOP_WORDS:
            entities.append({"type": "person", "value": name})

    # Group name — for create_group, also capture the name after "group" before modifiers
    group_match = re.search(
        r'(?:group|in the|called|named|in)\s+([a-z][a-z0-9 ]*?)(?:\s+(?:saying|and|group|which|that|private|public|where|users|members|approval)|$)',
        lower,
    )
    if group_match and intent in ("create_group", "call_group", "query_members", "add_member"):
        name = group_match.group(1).strip()
        if name.lower() not in STOP_WORDS:
            entities.append({"type": "group", "value": name})

    # Privacy (for create_group)
    if intent == "create_group":
        if re.search(r'\bprivate\b', lower):
            entities.append({"type": "privacy", "value": "private"})
        elif re.search(r'\bpublic\b', lower):
            entities.append({"type": "privacy", "value": "public"})

        # Approval required
        if re.search(r'approv|need.+approved|require.+approval', lower):
            entities.append({"type": "approval", "value": "true"})

    # Message content
    msg_match = re.search(r'(?:saying|send|drop|say|tell them)\s+(.+)$', lower)
    if msg_match and intent == "send_message":
        entities.append({"type": "message", "value": msg_match.group(1).strip()})

    # Screen name
    screen_match = re.search(
        r'(?:go to|open|show|switch to)\s+(groups?|chats?|settings?|home|profile)',
        lower,
    )
    if screen_match and intent == "navigate":
        entities.append({"type": "screen", "value": screen_match.group(1).lower().rstrip("s")})

    # Settings action
    if intent == "settings_change":
        if re.search(r'log\s*out|logout|sign\s*out', lower):
            entities.append({"type": "screen", "value": "logout"})
        elif re.search(r'theme|dark\s*mode|light\s*mode', lower):
            entities.append({"type": "screen", "value": "theme"})
        elif re.search(r'name|profile', lower):
            entities.append({"type": "screen", "value": "profile"})

    return entities


# ── Main classification function ─────────────────────────────────

async def classify_intent(
    text: str,
    group_names: list[str] | None = None,
    member_names: list[str] | None = None,
    current_screen: str = "MainTabs",
) -> dict:
    """
    Classify user intent using 3-tier pipeline:
    1. LLM (Ollama) — best quality, may timeout
    2. Embeddings (Sentence-Transformers) — fast, good quality
    3. Regex (keyword clusters) — always available
    """
    start = time.time()
    group_names = group_names or []
    member_names = member_names or []

    # Tier 1: Try LLM
    result = await _classify_with_llm(text, group_names, member_names, current_screen)
    if result and result["confidence"] >= 0.6:
        result["latency_ms"] = round((time.time() - start) * 1000)
        logger.info("Tier 1 (LLM): %s → %s (%.2f) in %dms",
                     text[:50], result["intent"], result["confidence"], result["latency_ms"])
        return result

    # Tier 2: Try embeddings
    result = _classify_with_embeddings(text)
    if result and result["confidence"] >= 0.45:
        result["latency_ms"] = round((time.time() - start) * 1000)
        logger.info("Tier 2 (Embedding): %s → %s (%.2f) in %dms",
                     text[:50], result["intent"], result["confidence"], result["latency_ms"])
        return result

    # Tier 3: Regex fallback
    result = _classify_with_regex(text)
    result["latency_ms"] = round((time.time() - start) * 1000)
    logger.info("Tier 3 (Regex): %s → %s (%.2f) in %dms",
                 text[:50], result["intent"], result["confidence"], result["latency_ms"])
    return result
