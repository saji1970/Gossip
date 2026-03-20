"""
Action Engine — orchestrates multi-step conversational actions.

Takes classified intent + entities, executes backend actions (create group,
add member, send invite, send message), and returns results with suggested
next actions for the Alexa-like conversational flow.
"""

from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.database import GroupModel, UserModel
from backend.services import group_service
from backend.services.invite_service import send_invite_email

logger = logging.getLogger(__name__)


def _entity_map(entities: list[dict]) -> dict[str, str]:
    """Flatten entity list into a type→value dict (last wins on duplicates)."""
    m: dict[str, str] = {}
    for e in entities:
        m[e.get("type", "")] = e.get("value", "")
    return m


async def execute_action(
    session: AsyncSession,
    user_id: str,
    user_email: str,
    user_display_name: str,
    intent: str,
    entities: list[dict],
    confirmed: bool = False,
) -> dict:
    """Execute an action and return a result dict."""
    em = _entity_map(entities)

    handler = _HANDLERS.get(intent)
    if not handler:
        return _result(False, f"I can't execute '{intent}' yet.", intent)

    return await handler(session, user_id, user_email, user_display_name, em, entities, confirmed)


# ── Handlers ─────────────────────────────────────────────────────


async def _exec_create_group(
    session: AsyncSession,
    user_id: str,
    user_email: str,
    user_display_name: str,
    em: dict,
    entities: list[dict],
    confirmed: bool,
) -> dict:
    group_name = em.get("group", "").strip()
    if not group_name:
        return _result(False, "What would you like to name the group?", "create_group",
                        needs_info="group_name")

    privacy = em.get("privacy", "private")
    require_approval = em.get("approval", "false").lower() == "true"

    # Collect inline member additions
    members: list[dict] = []
    person_email = em.get("email", "").strip()
    person_name = em.get("person", "").strip()
    if person_email:
        members.append({"email": person_email, "role": "member", "status": "pending"})

    try:
        group = await group_service.create_group(
            session,
            user_id=user_id,
            user_email=user_email,
            name=group_name,
            privacy=privacy,
            require_approval=require_approval,
            members=members,
        )
    except ValueError as exc:
        return _result(False, str(exc), "create_group")

    msg = f'Group "{group_name}" created!'
    next_actions: list[dict] = []

    if person_email:
        # Member was added inline — offer to send invite
        inviter = user_display_name or user_email
        email_sent = send_invite_email(person_email, group_name, inviter)
        label = person_name or person_email
        msg += f" {label} added."
        if email_sent:
            msg += " Invite email sent!"
        next_actions.append({
            "type": "add_member",
            "label": "Add another member",
            "params": {"groupId": group["id"], "groupName": group_name},
        })
    else:
        next_actions.append({
            "type": "add_member",
            "label": "Add members",
            "params": {"groupId": group["id"], "groupName": group_name},
        })

    next_actions.append({
        "type": "open_group",
        "label": f"Open {group_name}",
        "params": {"groupId": group["id"]},
    })

    return _result(True, msg, "create_group", data={"group": group}, next_actions=next_actions)


async def _exec_add_member(
    session: AsyncSession,
    user_id: str,
    user_email: str,
    user_display_name: str,
    em: dict,
    entities: list[dict],
    confirmed: bool,
) -> dict:
    email = em.get("email", "").strip()
    person = em.get("person", "").strip()
    group_name = em.get("group", "").strip()

    if not email:
        return _result(False, f"What's {person or 'their'} email?", "add_member", needs_info="email")

    if not group_name:
        return _result(False, "Which group should I add them to?", "add_member", needs_info="group_name")

    group = await _find_group_by_name(session, user_id, group_name)
    if not group:
        return _result(False, f'Couldn\'t find a group called "{group_name}".', "add_member")

    if not confirmed:
        return _result(
            True,
            f"Add {person or email} to {group.name} and send an invite?",
            "add_member",
            confirm=True,
            data={"groupId": group.id, "groupName": group.name, "email": email, "person": person},
        )

    try:
        member = await group_service.add_member_by_email(session, group.id, email)
    except ValueError as exc:
        return _result(False, str(exc), "add_member")

    inviter = user_display_name or user_email
    email_sent = send_invite_email(email, group.name, inviter)
    label = person or email
    invite_note = " Invite email sent!" if email_sent else ""

    return _result(
        True,
        f"{label} added to {group.name}!{invite_note}",
        "add_member",
        data={"member": member, "emailSent": email_sent},
        next_actions=[
            {"type": "add_member", "label": "Add another member", "params": {"groupId": group.id, "groupName": group.name}},
            {"type": "open_group", "label": f"Open {group.name}", "params": {"groupId": group.id}},
        ],
    )


async def _exec_send_message(
    session: AsyncSession,
    user_id: str,
    user_email: str,
    user_display_name: str,
    em: dict,
    entities: list[dict],
    confirmed: bool,
) -> dict:
    content = em.get("message", "").strip()
    group_name = em.get("group", "").strip()

    if not content:
        return _result(False, "What do you want to say?", "send_message", needs_info="message")
    if not group_name:
        return _result(False, "Which group should I send it to?", "send_message", needs_info="group_name")

    group = await _find_group_by_name(session, user_id, group_name)
    if not group:
        return _result(False, f'Couldn\'t find a group called "{group_name}".', "send_message")

    user_row = await session.execute(select(UserModel).where(UserModel.id == user_id))
    db_user = user_row.scalar_one_or_none()
    sender_name = db_user.display_name if db_user else "Unknown"

    msg = await group_service.save_message(
        session, group_id=group.id, sender_id=user_id, sender_name=sender_name, content=content,
    )

    return _result(True, f"Message sent to {group.name}!", "send_message", data={"message": msg})


# ── Helpers ──────────────────────────────────────────────────────


async def _find_group_by_name(session: AsyncSession, user_id: str, name: str) -> GroupModel | None:
    result = await session.execute(
        select(GroupModel)
        .where(GroupModel.created_by == user_id, func.lower(GroupModel.name) == name.strip().lower())
        .options(selectinload(GroupModel.members))
    )
    return result.scalar_one_or_none()


def _result(
    success: bool,
    message: str,
    action_type: str,
    *,
    data: dict | None = None,
    next_actions: list[dict] | None = None,
    confirm: bool = False,
    needs_info: str | None = None,
) -> dict:
    return {
        "success": success,
        "message": message,
        "actionType": action_type,
        "data": data or {},
        "nextActions": next_actions or [],
        "confirmationRequired": confirm,
        "needsInfo": needs_info,
    }


_HANDLERS = {
    "create_group": _exec_create_group,
    "add_member": _exec_add_member,
    "send_message": _exec_send_message,
}
