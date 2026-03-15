from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.database import GroupMemberModel, GroupModel, MessageModel


def _member_to_dict(m: GroupMemberModel) -> dict:
    return {
        "email": m.email,
        "role": m.role,
        "status": m.status,
        "joinedAt": m.joined_at.isoformat() if m.joined_at else "",
        "approvedBy": m.approved_by,
    }


def _group_to_dict(g: GroupModel) -> dict:
    return {
        "id": g.id,
        "name": g.name,
        "description": g.description or "",
        "privacy": g.privacy,
        "termsAndConditions": g.terms_and_conditions or "",
        "requireApproval": g.require_approval,
        "lastMessage": g.last_message or "",
        "timestamp": g.updated_at.isoformat() if g.updated_at else "",
        "unreadCount": 0,
        "members": [_member_to_dict(m) for m in g.members],
        "createdBy": g.created_by,
        "createdAt": g.created_at.isoformat() if g.created_at else "",
    }


async def get_user_groups(session: AsyncSession, user_id: str) -> list[dict]:
    """Get all groups created by a user."""
    result = await session.execute(
        select(GroupModel)
        .where(GroupModel.created_by == user_id)
        .options(selectinload(GroupModel.members))
        .order_by(GroupModel.created_at.desc())
    )
    groups = result.scalars().all()
    return [_group_to_dict(g) for g in groups]


async def create_group(
    session: AsyncSession,
    user_id: str,
    user_email: str,
    name: str,
    description: str = "",
    privacy: str = "private",
    terms_and_conditions: str = "",
    require_approval: bool = False,
    members: list[dict] | None = None,
) -> dict:
    """Create a new group and add the creator as admin member."""
    group = GroupModel(
        name=name,
        description=description,
        privacy=privacy,
        terms_and_conditions=terms_and_conditions,
        require_approval=require_approval,
        last_message="Group created",
        created_by=user_id,
    )
    session.add(group)
    await session.flush()

    # Add creator as admin member
    admin_member = GroupMemberModel(
        group_id=group.id,
        user_id=user_id,
        email=user_email,
        role="admin",
        status="approved",
    )
    session.add(admin_member)

    # Add any additional members
    if members:
        for m in members:
            mem = GroupMemberModel(
                group_id=group.id,
                user_id=user_id,  # placeholder, will be resolved on join
                email=m.get("email", ""),
                role=m.get("role", "member"),
                status=m.get("status", "pending"),
            )
            session.add(mem)

    await session.commit()

    # Reload with members
    result = await session.execute(
        select(GroupModel)
        .where(GroupModel.id == group.id)
        .options(selectinload(GroupModel.members))
    )
    created = result.scalar_one()
    return _group_to_dict(created)


async def update_group(
    session: AsyncSession, group_id: str, user_id: str, updates: dict
) -> dict | None:
    """Update a group. Returns updated group dict or None if not found."""
    result = await session.execute(
        select(GroupModel)
        .where(GroupModel.id == group_id, GroupModel.created_by == user_id)
        .options(selectinload(GroupModel.members))
    )
    group = result.scalar_one_or_none()
    if not group:
        return None

    for key in ("name", "description", "privacy", "require_approval", "last_message"):
        if key in updates:
            setattr(group, key, updates[key])
    if "termsAndConditions" in updates:
        group.terms_and_conditions = updates["termsAndConditions"]

    await session.commit()
    await session.refresh(group)
    return _group_to_dict(group)


async def update_member_role(
    session: AsyncSession, group_id: str, member_email: str, role: str
) -> bool:
    result = await session.execute(
        select(GroupMemberModel).where(
            GroupMemberModel.group_id == group_id,
            GroupMemberModel.email == member_email,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        return False
    member.role = role
    await session.commit()
    return True


async def approve_member(
    session: AsyncSession, group_id: str, member_email: str, approver_email: str
) -> bool:
    result = await session.execute(
        select(GroupMemberModel).where(
            GroupMemberModel.group_id == group_id,
            GroupMemberModel.email == member_email,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        return False
    member.status = "approved"
    member.approved_by = approver_email
    await session.commit()
    return True


async def reject_member(
    session: AsyncSession, group_id: str, member_email: str
) -> bool:
    result = await session.execute(
        select(GroupMemberModel).where(
            GroupMemberModel.group_id == group_id,
            GroupMemberModel.email == member_email,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        return False
    await session.delete(member)
    await session.commit()
    return True


async def get_group_messages(
    session: AsyncSession, group_id: str, limit: int = 50, offset: int = 0
) -> list[dict]:
    result = await session.execute(
        select(MessageModel)
        .where(MessageModel.group_id == group_id)
        .order_by(MessageModel.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "groupId": m.group_id,
            "senderId": m.sender_id,
            "senderName": m.sender_name,
            "content": m.content,
            "isOwnMessage": m.is_own_message,
            "timestamp": m.created_at.isoformat() if m.created_at else "",
        }
        for m in messages
    ]


async def save_message(
    session: AsyncSession,
    group_id: str,
    sender_id: str,
    sender_name: str,
    content: str,
    is_own_message: bool = True,
) -> dict:
    msg = MessageModel(
        group_id=group_id,
        sender_id=sender_id,
        sender_name=sender_name,
        content=content,
        is_own_message=is_own_message,
    )
    session.add(msg)

    # Update group's last message
    result = await session.execute(
        select(GroupModel).where(GroupModel.id == group_id)
    )
    group = result.scalar_one_or_none()
    if group:
        group.last_message = content[:100]

    await session.commit()
    await session.refresh(msg)

    return {
        "id": msg.id,
        "groupId": msg.group_id,
        "senderId": msg.sender_id,
        "senderName": msg.sender_name,
        "content": msg.content,
        "isOwnMessage": msg.is_own_message,
        "timestamp": msg.created_at.isoformat() if msg.created_at else "",
    }
