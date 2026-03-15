import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import engine, get_session
from backend.models.database import Base
from backend.services import auth_service, group_service

AUDIO_UPLOAD_DIR = os.getenv("AUDIO_UPLOAD_DIR", "audio_uploads")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Gossip AI backend")
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready")
    # Start AI scheduler (non-critical — don't block startup)
    try:
        from backend.jobs.personality_update_job import start_scheduler, stop_scheduler
        start_scheduler()
    except Exception as exc:
        logger.warning("Scheduler failed to start (non-critical): %s", exc)
        stop_scheduler = lambda: None  # noqa: E731
    yield
    try:
        stop_scheduler()
    except Exception:
        pass
    logger.info("Gossip AI backend stopped")


app = FastAPI(
    title="Gossip AI Backend",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler (surfaces errors in production) ──────


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


# ── Auth dependency ───────────────────────────────────────────────


async def get_current_user(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    user = await auth_service.get_current_user(session, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


# ── Request / Response Models ──────────────────────────────────────


class RegisterRequest(BaseModel):
    email: str
    password: str
    displayName: str
    username: str


class LoginRequest(BaseModel):
    usernameOrEmail: str
    password: str


class CreateGroupRequest(BaseModel):
    name: str
    description: str = ""
    privacy: str = "private"
    termsAndConditions: str = ""
    requireApproval: bool = False
    members: list[dict] = []


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    privacy: Optional[str] = None
    requireApproval: Optional[bool] = None
    lastMessage: Optional[str] = None
    termsAndConditions: Optional[str] = None


class MemberRoleRequest(BaseModel):
    memberEmail: str
    role: str


class MemberApproveRequest(BaseModel):
    memberEmail: str
    approverEmail: str


class MemberRejectRequest(BaseModel):
    memberEmail: str


class SendMessageRequest(BaseModel):
    groupId: str
    senderName: str
    content: str
    isOwnMessage: bool = True


class MessageAnalyzeRequest(BaseModel):
    text: str
    group_id: str
    sender_id: str
    sender_name: Optional[str] = None


class ReplySuggestionsRequest(BaseModel):
    text: str
    emotion: str
    topic: str
    speaker_traits: dict = {}
    count: int = 5


class AnalysisResponse(BaseModel):
    speaker: str
    transcript: str
    emotion: str
    emotion_confidence: float
    sarcasm: bool
    topic: str
    topic_id: Optional[str]
    personality_traits: dict
    reply_suggestions: list


class PersonalityResponse(BaseModel):
    id: str
    name: Optional[str]
    conversation_count: int
    trait_scores: dict
    top_topics: dict
    emotion_distribution: dict
    speech_styles: list
    badge_traits: list


class TopicResponse(BaseModel):
    topic_id: str
    label: str
    message_count: int
    last_seen: float


# ── Health ────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/debug/register")
async def debug_register():
    """Debug endpoint — tests register without FastAPI DI."""
    try:
        from backend.db import async_session
        async with async_session() as session:
            result = await auth_service.register_user(
                session,
                email="debug@test.com",
                password="debug123",
                display_name="Debug User",
                username="debuguser",
            )
            return result
    except Exception as exc:
        import traceback
        return {"error": str(exc), "traceback": traceback.format_exc()}


@app.get("/health/db")
async def health_db():
    """Check database connectivity."""
    try:
        from backend.config import DATABASE_URL
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "db_url_prefix": DATABASE_URL[:30] + "..."}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


# ── Auth Endpoints ────────────────────────────────────────────────


@app.post("/auth/register")
async def register(req: RegisterRequest, session: AsyncSession = Depends(get_session)):
    try:
        result = await auth_service.register_user(
            session,
            email=req.email,
            password=req.password,
            display_name=req.displayName,
            username=req.username,
        )
    except Exception as exc:
        logger.exception("Register failed")
        raise HTTPException(status_code=500, detail=str(exc))
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/auth/login")
async def login(req: LoginRequest, session: AsyncSession = Depends(get_session)):
    result = await auth_service.login_user(
        session,
        username_or_email=req.usernameOrEmail,
        password=req.password,
    )
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["error"])
    return result


@app.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"success": True, "user": user}


# ── Group Endpoints ───────────────────────────────────────────────


@app.get("/groups")
async def list_groups(
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    groups = await group_service.get_user_groups(session, user["uid"])
    return {"groups": groups}


@app.post("/groups")
async def create_group(
    req: CreateGroupRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        group = await group_service.create_group(
            session,
            user_id=user["uid"],
            user_email=user["email"],
            name=req.name,
            description=req.description,
            privacy=req.privacy,
            terms_and_conditions=req.termsAndConditions,
            require_approval=req.requireApproval,
            members=req.members,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"group": group}


@app.delete("/groups/{group_id}")
async def delete_group(
    group_id: str,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    deleted = await group_service.delete_group(session, group_id, user["uid"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Group not found or not authorized")
    return {"success": True}


@app.put("/groups/{group_id}")
async def update_group(
    group_id: str,
    req: UpdateGroupRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    updates = req.model_dump(exclude_none=True)
    group = await group_service.update_group(session, group_id, user["uid"], updates)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"group": group}


@app.put("/groups/{group_id}/member-role")
async def update_member_role(
    group_id: str,
    req: MemberRoleRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    ok = await group_service.update_member_role(session, group_id, req.memberEmail, req.role)
    if not ok:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}


@app.put("/groups/{group_id}/approve-member")
async def approve_member(
    group_id: str,
    req: MemberApproveRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    ok = await group_service.approve_member(
        session, group_id, req.memberEmail, req.approverEmail
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}


@app.put("/groups/{group_id}/reject-member")
async def reject_member(
    group_id: str,
    req: MemberRejectRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    ok = await group_service.reject_member(session, group_id, req.memberEmail)
    if not ok:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}


# ── Message Endpoints ─────────────────────────────────────────────


@app.get("/groups/{group_id}/messages")
async def list_messages(
    group_id: str,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    messages = await group_service.get_group_messages(session, group_id, limit, offset)
    # Filter out whisper messages not addressed to this user
    filtered = []
    for msg in messages:
        whisper = msg.get("whisperTo")
        if not whisper:
            filtered.append(msg)
            continue
        whisper_list = json.loads(whisper) if isinstance(whisper, str) else whisper
        if user["email"] in whisper_list or user["uid"] == msg["senderId"]:
            filtered.append(msg)
    return {"messages": filtered}


@app.post("/messages")
async def send_message(
    req: SendMessageRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    msg = await group_service.save_message(
        session,
        group_id=req.groupId,
        sender_id=user["uid"],
        sender_name=req.senderName,
        content=req.content,
        is_own_message=req.isOwnMessage,
    )
    return {"message": msg}


# ── Voice Message Endpoints ───────────────────────────────────────


@app.post("/messages/voice")
async def send_voice_message(
    audio: UploadFile = File(...),
    groupId: str = Form(...),
    senderName: str = Form(...),
    durationMs: int = Form(...),
    whisperTo: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Upload a voice message. whisperTo is a JSON array of recipient emails."""
    # Create directory for this group's audio files
    group_dir = Path(AUDIO_UPLOAD_DIR) / groupId
    group_dir.mkdir(parents=True, exist_ok=True)

    # Save the audio file
    msg_id = str(uuid.uuid4())
    file_ext = ".m4a"
    audio_path = group_dir / f"{msg_id}{file_ext}"

    audio_bytes = await audio.read()
    audio_path.write_bytes(audio_bytes)

    # Parse whisperTo
    whisper_list = None
    if whisperTo:
        try:
            whisper_list = json.loads(whisperTo)
        except json.JSONDecodeError:
            whisper_list = None

    # Save message to database
    msg = await group_service.save_voice_message(
        session,
        group_id=groupId,
        sender_id=user["uid"],
        sender_name=senderName,
        audio_file_path=str(audio_path),
        audio_duration_ms=durationMs,
        whisper_to=json.dumps(whisper_list) if whisper_list else None,
        message_id=msg_id,
    )
    return {"message": msg}


@app.get("/audio/{message_id}")
async def get_audio(
    message_id: str,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Serve an audio file. Checks group membership and whisper permissions."""
    msg = await group_service.get_message_by_id(session, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Verify user is in the group
    is_member = await group_service.is_group_member(session, msg["groupId"], user["uid"])
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")

    # Check whisper permissions
    if msg.get("whisperTo"):
        whisper_list = json.loads(msg["whisperTo"]) if isinstance(msg["whisperTo"], str) else msg["whisperTo"]
        if user["email"] not in whisper_list and user["uid"] != msg["senderId"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this whisper")

    audio_path = msg.get("audioFilePath")
    if not audio_path or not Path(audio_path).exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(audio_path, media_type="audio/mp4")


# ── AI Endpoints ──────────────────────────────────────────────────


@app.post("/voice/process", response_model=AnalysisResponse)
async def voice_process(
    audio: UploadFile = File(...),
    group_id: str = Form(...),
    sender_id: Optional[str] = Form(None),
    sender_name: Optional[str] = Form(None),
):
    from backend.services.conversation_pipeline import process_voice as _process_voice

    audio_bytes = await audio.read()
    result = await _process_voice(
        audio_bytes=audio_bytes,
        group_id=group_id,
        sender_id=sender_id,
        sender_name=sender_name,
    )
    return AnalysisResponse(
        speaker=result.speaker,
        transcript=result.transcript,
        emotion=result.emotion,
        emotion_confidence=result.emotion_confidence,
        sarcasm=result.sarcasm,
        topic=result.topic,
        topic_id=result.topic_id,
        personality_traits=result.personality_traits,
        reply_suggestions=result.reply_suggestions,
    )


@app.post("/message/analyze", response_model=AnalysisResponse)
async def message_analyze(req: MessageAnalyzeRequest):
    from backend.services.conversation_pipeline import analyze_message as _analyze_message

    result = await _analyze_message(
        text=req.text,
        group_id=req.group_id,
        sender_id=req.sender_id,
        sender_name=req.sender_name,
    )
    return AnalysisResponse(
        speaker=result.speaker,
        transcript=result.transcript,
        emotion=result.emotion,
        emotion_confidence=result.emotion_confidence,
        sarcasm=result.sarcasm,
        topic=result.topic,
        topic_id=result.topic_id,
        personality_traits=result.personality_traits,
        reply_suggestions=result.reply_suggestions,
    )


@app.get("/personality/{user_id}", response_model=PersonalityResponse)
async def get_personality(user_id: str):
    from backend.services.personality_engine import personality_engine as _pe

    profile = _pe.get_profile(user_id)
    if profile is None:
        return PersonalityResponse(
            id=user_id,
            name=None,
            conversation_count=0,
            trait_scores={},
            top_topics={},
            emotion_distribution={},
            speech_styles=[],
            badge_traits=[],
        )

    badge_traits = _pe.get_badge_traits(user_id)

    return PersonalityResponse(
        id=profile.id,
        name=profile.name,
        conversation_count=profile.conversation_count,
        trait_scores=profile.trait_scores,
        top_topics=profile.top_topics,
        emotion_distribution=profile.emotion_distribution,
        speech_styles=profile.speech_styles,
        badge_traits=badge_traits,
    )


@app.get("/topics/trending", response_model=list[TopicResponse])
async def trending_topics(limit: int = 10):
    from backend.services.topic_service import topic_service as _ts

    topics = _ts.get_trending_topics(limit=limit)
    return [
        TopicResponse(
            topic_id=t["topic_id"],
            label=t["label"],
            message_count=t["message_count"],
            last_seen=t["last_seen"],
        )
        for t in topics
    ]


@app.post("/reply/suggestions")
async def reply_suggestions(req: ReplySuggestionsRequest):
    from backend.services.reply_service import generate_reply_suggestions

    suggestions = await generate_reply_suggestions(
        text=req.text,
        emotion=req.emotion,
        topic=req.topic,
        speaker_traits=req.speaker_traits,
        count=req.count,
    )
    return {"suggestions": suggestions}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )
