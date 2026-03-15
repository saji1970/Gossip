from __future__ import annotations

import logging
import io
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.spatial.distance import cosine

from backend.config import PYANNOTE_AUTH_TOKEN, SPEAKERS_COLLECTION
from backend.models.speaker_profile import SpeakerProfile

logger = logging.getLogger(__name__)

_pipeline = None
_embedding_model = None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        if not PYANNOTE_AUTH_TOKEN:
            logger.warning(
                "PYANNOTE_AUTH_TOKEN not set; speaker diarization unavailable"
            )
            return None
        from pyannote.audio import Pipeline

        _pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=PYANNOTE_AUTH_TOKEN,
        )
    return _pipeline


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        if not PYANNOTE_AUTH_TOKEN:
            return None
        from pyannote.audio import Inference

        _embedding_model = Inference(
            "pyannote/embedding",
            use_auth_token=PYANNOTE_AUTH_TOKEN,
        )
    return _embedding_model


class SpeakerService:
    def __init__(self) -> None:
        self._profiles: Dict[str, SpeakerProfile] = {}
        self._similarity_threshold: float = 0.70

    def diarize(self, audio_path: str) -> List[Dict]:
        pipeline = _get_pipeline()
        if pipeline is None:
            return [{"speaker": "unknown", "start": 0.0, "end": 0.0}]

        diarization = pipeline(audio_path)
        segments = []
        for turn, _, speaker_label in diarization.itertracks(yield_label=True):
            segments.append(
                {
                    "speaker": speaker_label,
                    "start": turn.start,
                    "end": turn.end,
                }
            )
        return segments

    def generate_embedding(self, audio_path: str) -> Optional[List[float]]:
        model = _get_embedding_model()
        if model is None:
            return None

        embedding = model(audio_path)
        return embedding.data.flatten().tolist()

    def generate_embedding_from_bytes(
        self, audio_bytes: bytes, sample_rate: int = 16000
    ) -> Optional[List[float]]:
        model = _get_embedding_model()
        if model is None:
            return None

        import soundfile as sf

        audio_data, sr = sf.read(io.BytesIO(audio_bytes))
        if sr != sample_rate:
            import librosa

            audio_data = librosa.resample(
                audio_data, orig_sr=sr, target_sr=sample_rate
            )

        import tempfile
        import os

        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        try:
            sf.write(tmp.name, audio_data, sample_rate)
            embedding = model(tmp.name)
            return embedding.data.flatten().tolist()
        finally:
            os.unlink(tmp.name)

    def match_speaker(
        self, embedding: List[float]
    ) -> Tuple[Optional[str], float]:
        if not embedding or not self._profiles:
            return None, 0.0

        best_id: Optional[str] = None
        best_similarity: float = 0.0
        query = np.array(embedding)

        for profile_id, profile in self._profiles.items():
            if not profile.voice_embedding:
                continue
            stored = np.array(profile.voice_embedding)
            similarity = 1.0 - cosine(query, stored)
            if similarity > best_similarity:
                best_similarity = similarity
                best_id = profile_id

        if best_similarity >= self._similarity_threshold:
            return best_id, best_similarity

        return None, best_similarity

    def create_profile(
        self,
        voice_embedding: Optional[List[float]] = None,
        name: Optional[str] = None,
    ) -> SpeakerProfile:
        profile = SpeakerProfile(
            voice_embedding=voice_embedding or [],
            name=name,
        )
        self._profiles[profile.id] = profile
        logger.info("Created speaker profile %s (%s)", profile.id, name)
        return profile

    def get_or_create_speaker(
        self,
        voice_embedding: Optional[List[float]],
        fallback_name: str = "Unknown",
    ) -> SpeakerProfile:
        if voice_embedding:
            matched_id, similarity = self.match_speaker(voice_embedding)
            if matched_id:
                logger.info(
                    "Matched speaker %s (%.2f similarity)",
                    matched_id,
                    similarity,
                )
                return self._profiles[matched_id]

        return self.create_profile(
            voice_embedding=voice_embedding, name=fallback_name
        )

    def get_profile(self, speaker_id: str) -> Optional[SpeakerProfile]:
        return self._profiles.get(speaker_id)

    def get_all_profiles(self) -> List[SpeakerProfile]:
        return list(self._profiles.values())

    def update_profile(
        self, speaker_id: str, updates: Dict
    ) -> Optional[SpeakerProfile]:
        profile = self._profiles.get(speaker_id)
        if profile is None:
            return None

        import time

        for key, value in updates.items():
            if hasattr(profile, key):
                setattr(profile, key, value)
        profile.updated_at = time.time()

        self._profiles[speaker_id] = profile
        return profile


speaker_service = SpeakerService()
