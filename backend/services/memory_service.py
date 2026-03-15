from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)
from sentence_transformers import SentenceTransformer

from backend.config import (
    EMBEDDING_DIMENSION,
    EMBEDDING_MODEL,
    MESSAGES_COLLECTION,
    QDRANT_HOST,
    QDRANT_PORT,
)

logger = logging.getLogger(__name__)


class MemoryService:
    def __init__(self) -> None:
        self._client: Optional[QdrantClient] = None
        self._encoder: Optional[SentenceTransformer] = None

    @property
    def client(self) -> QdrantClient:
        if self._client is None:
            self._client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
            self._ensure_collection()
        return self._client

    @property
    def encoder(self) -> SentenceTransformer:
        if self._encoder is None:
            self._encoder = SentenceTransformer(EMBEDDING_MODEL)
        return self._encoder

    def _ensure_collection(self) -> None:
        collections = [c.name for c in self.client.get_collections().collections]
        if MESSAGES_COLLECTION not in collections:
            self.client.create_collection(
                collection_name=MESSAGES_COLLECTION,
                vectors_config=VectorParams(
                    size=EMBEDDING_DIMENSION, distance=Distance.COSINE
                ),
            )
            logger.info("Created collection %s", MESSAGES_COLLECTION)

    def embed_text(self, text: str) -> List[float]:
        return self.encoder.encode(text).tolist()

    def store_message_embedding(
        self,
        message_id: str,
        text: str,
        group_id: str,
        sender_id: str,
        timestamp: float,
        emotion: str,
        topic: str,
        personality_traits_detected: Dict[str, float],
    ) -> None:
        embedding = self.embed_text(text)

        point = PointStruct(
            id=hash(message_id) % (2**63),
            vector=embedding,
            payload={
                "message_id": message_id,
                "group_id": group_id,
                "sender_id": sender_id,
                "timestamp": timestamp,
                "emotion": emotion,
                "topic": topic,
                "personality_traits_detected": personality_traits_detected,
                "text": text,
            },
        )

        self.client.upsert(
            collection_name=MESSAGES_COLLECTION,
            points=[point],
        )

    def search_related_conversations(
        self,
        query_text: str,
        group_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        query_vector = self.embed_text(query_text)

        query_filter = None
        if group_id:
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="group_id", match=MatchValue(value=group_id)
                    )
                ]
            )

        results = self.client.search(
            collection_name=MESSAGES_COLLECTION,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=limit,
        )

        return [
            {
                "score": hit.score,
                "message_id": hit.payload.get("message_id"),
                "text": hit.payload.get("text"),
                "sender_id": hit.payload.get("sender_id"),
                "emotion": hit.payload.get("emotion"),
                "topic": hit.payload.get("topic"),
                "timestamp": hit.payload.get("timestamp"),
            }
            for hit in results
        ]

    def get_topic_history(
        self,
        topic: str,
        group_id: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        must_conditions = [
            FieldCondition(key="topic", match=MatchValue(value=topic))
        ]
        if group_id:
            must_conditions.append(
                FieldCondition(
                    key="group_id", match=MatchValue(value=group_id)
                )
            )

        results = self.client.scroll(
            collection_name=MESSAGES_COLLECTION,
            scroll_filter=Filter(must=must_conditions),
            limit=limit,
        )

        points = results[0]
        return [
            {
                "message_id": p.payload.get("message_id"),
                "text": p.payload.get("text"),
                "sender_id": p.payload.get("sender_id"),
                "emotion": p.payload.get("emotion"),
                "timestamp": p.payload.get("timestamp"),
            }
            for p in points
        ]

    def get_sender_messages(
        self, sender_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        results = self.client.scroll(
            collection_name=MESSAGES_COLLECTION,
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="sender_id",
                        match=MatchValue(value=sender_id),
                    )
                ]
            ),
            limit=limit,
        )

        points = results[0]
        return [
            {
                "message_id": p.payload.get("message_id"),
                "text": p.payload.get("text"),
                "emotion": p.payload.get("emotion"),
                "topic": p.payload.get("topic"),
                "timestamp": p.payload.get("timestamp"),
                "personality_traits_detected": p.payload.get(
                    "personality_traits_detected", {}
                ),
            }
            for p in points
        ]


memory_service = MemoryService()
