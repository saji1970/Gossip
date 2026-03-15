from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import JWT_ALGORITHM, JWT_EXPIRE_HOURS, JWT_SECRET
from backend.models.database import UserModel


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> str | None:
    """Return user_id from token, or None if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def register_user(
    session: AsyncSession,
    email: str,
    password: str,
    display_name: str,
    username: str,
) -> dict:
    """Register a new user. Returns {success, error?, user?, token?}."""
    # Check existing email
    existing = await session.execute(
        select(UserModel).where(UserModel.email == email)
    )
    if existing.scalar_one_or_none():
        return {"success": False, "error": "Email already registered"}

    # Check existing username
    existing_name = await session.execute(
        select(UserModel).where(UserModel.username == username.lower())
    )
    if existing_name.scalar_one_or_none():
        return {"success": False, "error": "Username already taken"}

    user = UserModel(
        email=email,
        username=username.lower(),
        display_name=display_name,
        password_hash=hash_password(password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_access_token(user.id)
    return {
        "success": True,
        "user": {
            "uid": user.id,
            "email": user.email,
            "displayName": user.display_name,
            "username": user.username,
        },
        "token": token,
    }


async def login_user(
    session: AsyncSession, username_or_email: str, password: str
) -> dict:
    """Login a user. Returns {success, error?, user?, token?}."""
    if "@" in username_or_email:
        stmt = select(UserModel).where(UserModel.email == username_or_email)
    else:
        stmt = select(UserModel).where(
            UserModel.username == username_or_email.lower()
        )

    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        return {"success": False, "error": "Invalid credentials"}

    token = create_access_token(user.id)
    return {
        "success": True,
        "user": {
            "uid": user.id,
            "email": user.email,
            "displayName": user.display_name,
            "username": user.username,
        },
        "token": token,
    }


async def get_current_user(session: AsyncSession, token: str) -> dict | None:
    """Return user dict from a Bearer token, or None."""
    user_id = decode_token(token)
    if not user_id:
        return None

    result = await session.execute(
        select(UserModel).where(UserModel.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return None

    return {
        "uid": user.id,
        "email": user.email,
        "displayName": user.display_name,
        "username": user.username,
    }
