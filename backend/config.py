import os

# ── Database ──────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/gossip")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "72"))

# ── Qdrant ────────────────────────────────────────────────────────
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL", "all-MiniLM-L6-v2"
)
EMBEDDING_DIMENSION = 384

EMOTION_MODEL = os.getenv(
    "EMOTION_MODEL", "bhadresh-savani/distilbert-base-uncased-emotion"
)

WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

PYANNOTE_AUTH_TOKEN = os.getenv("PYANNOTE_AUTH_TOKEN", "")

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

MESSAGES_COLLECTION = "messages"
TOPICS_COLLECTION = "topic_clusters"
SPEAKERS_COLLECTION = "speaker_profiles"

TOPIC_SIMILARITY_THRESHOLD = float(
    os.getenv("TOPIC_SIMILARITY_THRESHOLD", "0.75")
)

PERSONALITY_UPDATE_INTERVAL_HOURS = int(
    os.getenv("PERSONALITY_UPDATE_INTERVAL_HOURS", "12")
)

TRAIT_BADGE_THRESHOLD = 0.5

SUPPORTED_EMOTIONS = [
    "sarcasm",
    "excitement",
    "anger",
    "curiosity",
    "amusement",
    "surprise",
]

PERSONALITY_TRAITS = [
    "sarcastic",
    "dramatic",
    "curious",
    "supportive",
    "secretive",
    "skeptical",
]
