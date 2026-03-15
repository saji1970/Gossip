from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    groups: Mapped[list[GroupModel]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    memberships: Mapped[list[GroupMemberModel]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class GroupModel(Base):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    privacy: Mapped[str] = mapped_column(String(20), default="private")
    terms_and_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    require_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    last_message: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped[UserModel] = relationship(back_populates="groups")
    members: Mapped[list[GroupMemberModel]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )
    messages: Mapped[list[MessageModel]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )


class GroupMemberModel(Base):
    __tablename__ = "group_members"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    group_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="member")  # admin | approver | member
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | approved | rejected
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    group: Mapped[GroupModel] = relationship(back_populates="members")
    user: Mapped[UserModel] = relationship(back_populates="memberships")


class MessageModel(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    group_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[str] = mapped_column(String(64), nullable=False)
    sender_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_own_message: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    group: Mapped[GroupModel] = relationship(back_populates="messages")
