from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from backend.config import PERSONALITY_UPDATE_INTERVAL_HOURS
from backend.services.memory_service import memory_service
from backend.services.personality_engine import personality_engine
from backend.services.topic_service import topic_service

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def _recompute_all_profiles() -> None:
    profiles = personality_engine.get_all_profiles()
    recomputed = 0

    for profile in profiles:
        try:
            messages = memory_service.get_sender_messages(
                profile.id, limit=200
            )
            if not messages:
                continue

            personality_engine.recompute_from_history(profile.id, messages)
            recomputed += 1
        except Exception as exc:
            logger.error(
                "Failed to recompute profile %s: %s", profile.id, exc
            )

    logger.info(
        "Personality update job complete: %d/%d profiles recomputed",
        recomputed,
        len(profiles),
    )


def _refresh_trending_topics() -> None:
    try:
        trending = topic_service.get_trending_topics(limit=20)
        logger.info(
            "Refreshed trending topics: %d clusters", len(trending)
        )
    except Exception as exc:
        logger.error("Failed to refresh trending topics: %s", exc)


def run_personality_update() -> None:
    logger.info("Running scheduled personality update job")
    _recompute_all_profiles()
    _refresh_trending_topics()


def start_scheduler() -> None:
    scheduler.add_job(
        run_personality_update,
        "interval",
        hours=PERSONALITY_UPDATE_INTERVAL_HOURS,
        id="personality_update",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Personality update scheduler started (every %dh)",
        PERSONALITY_UPDATE_INTERVAL_HOURS,
    )


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
    logger.info("Personality update scheduler stopped")
