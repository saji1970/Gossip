from __future__ import annotations

import logging
import time
import uuid
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.spatial.distance import cosine

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    VectorParams,
)

from backend.config import (
    EMBEDDING_DIMENSION,
    QDRANT_HOST,
    QDRANT_PORT,
    TOPICS_COLLECTION,
    TOPIC_SIMILARITY_THRESHOLD,
)
from backend.models.speaker_profile import TopicCluster
from backend.services.memory_service import memory_service

logger = logging.getLogger(__name__)

CATEGORY_SEEDS = {
    "relationship_drama": [
        "cheating boyfriend broke up crush dating relationship loyal",
        "ex girlfriend drama heartbreak jealousy love affair",
    ],
    "office_politics": [
        "boss manager meeting fired promoted salary coworker",
        "office work job company interview career raise",
    ],
    "social_plans": [
        "party weekend hangout dinner club concert drinks",
        "birthday celebration invite gathering going out friends",
    ],
    "gossip_tea": [
        "drama rumor heard apparently secret tea talking behind",
        "did you know can you believe spread gossip shade",
    ],
}


class TopicService:
    def __init__(self) -> None:
        self._client: Optional[QdrantClient] = None
        self._clusters: Dict[str, TopicCluster] = {}
        self._seed_embeddings: Dict[str, np.ndarray] = {}
        self._initialized = False

    @property
    def client(self) -> QdrantClient:
        if self._client is None:
            self._client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
            self._ensure_collection()
        return self._client

    def _ensure_collection(self) -> None:
        collections = [c.name for c in self.client.get_collections().collections]
        if TOPICS_COLLECTION not in collections:
            self.client.create_collection(
                collection_name=TOPICS_COLLECTION,
                vectors_config=VectorParams(
                    size=EMBEDDING_DIMENSION, distance=Distance.COSINE
                ),
            )
            logger.info("Created collection %s", TOPICS_COLLECTION)

    def _initialize_seeds(self) -> None:
        if self._initialized:
            return
        for category, seed_texts in CATEGORY_SEEDS.items():
            embeddings = [
                np.array(memory_service.embed_text(t)) for t in seed_texts
            ]
            centroid = np.mean(embeddings, axis=0)
            self._seed_embeddings[category] = centroid

            cluster = TopicCluster(
                topic_id=category,
                label=category.replace("_", " "),
                centroid=centroid.tolist(),
            )
            self._clusters[category] = cluster
        self._initialized = True

    def detect_topic(self, text: str) -> Dict:
        self._initialize_seeds()

        embedding = np.array(memory_service.embed_text(text))

        best_category = "general"
        best_similarity = 0.0

        for category, centroid in self._seed_embeddings.items():
            similarity = 1.0 - cosine(embedding, centroid)
            if similarity > best_similarity:
                best_similarity = similarity
                best_category = category

        for cluster_id, cluster in self._clusters.items():
            if cluster_id in CATEGORY_SEEDS:
                continue
            centroid = np.array(cluster.centroid)
            similarity = 1.0 - cosine(embedding, centroid)
            if similarity > best_similarity:
                best_similarity = similarity
                best_category = cluster_id

        if best_similarity < TOPIC_SIMILARITY_THRESHOLD:
            best_category = "general"

        return {
            "topic": best_category.replace("_", " "),
            "category": best_category,
            "confidence": float(best_similarity),
            "embedding": embedding.tolist(),
        }

    def cluster_topic(
        self, text: str, embedding: Optional[List[float]] = None
    ) -> Tuple[str, str]:
        self._initialize_seeds()

        if embedding is None:
            embedding = memory_service.embed_text(text)

        emb_array = np.array(embedding)

        best_id: Optional[str] = None
        best_sim: float = 0.0

        for cluster_id, cluster in self._clusters.items():
            centroid = np.array(cluster.centroid)
            sim = 1.0 - cosine(emb_array, centroid)
            if sim > best_sim:
                best_sim = sim
                best_id = cluster_id

        if best_id and best_sim >= TOPIC_SIMILARITY_THRESHOLD:
            cluster = self._clusters[best_id]
            cluster.message_count += 1
            cluster.last_seen = time.time()

            old_centroid = np.array(cluster.centroid)
            new_centroid = old_centroid * 0.95 + emb_array * 0.05
            cluster.centroid = new_centroid.tolist()
            self._clusters[best_id] = cluster

            self._store_cluster_point(cluster)
            return best_id, cluster.label

        new_id = str(uuid.uuid4())[:8]
        words = text.lower().split()[:4]
        label = " ".join(words) if words else "misc"

        new_cluster = TopicCluster(
            topic_id=new_id,
            label=label,
            centroid=embedding,
        )
        self._clusters[new_id] = new_cluster
        self._seed_embeddings[new_id] = emb_array
        self._store_cluster_point(new_cluster)

        return new_id, label

    def _store_cluster_point(self, cluster: TopicCluster) -> None:
        try:
            point = PointStruct(
                id=hash(cluster.topic_id) % (2**63),
                vector=cluster.centroid,
                payload={
                    "topic_id": cluster.topic_id,
                    "label": cluster.label,
                    "message_count": cluster.message_count,
                    "last_seen": cluster.last_seen,
                },
            )
            self.client.upsert(
                collection_name=TOPICS_COLLECTION, points=[point]
            )
        except Exception as exc:
            logger.error("Failed to store topic cluster: %s", exc)

    def get_trending_topics(self, limit: int = 10) -> List[Dict]:
        sorted_clusters = sorted(
            self._clusters.values(),
            key=lambda c: c.message_count,
            reverse=True,
        )

        return [
            {
                "topic_id": c.topic_id,
                "label": c.label,
                "message_count": c.message_count,
                "last_seen": c.last_seen,
            }
            for c in sorted_clusters[:limit]
        ]


topic_service = TopicService()
