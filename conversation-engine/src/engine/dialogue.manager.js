import * as contextManager from './context.manager.js';
import { logger } from '../config/logger.js';

/**
 * Dialogue Manager — decides what to do with a parsed intent given the current context.
 *
 * Returns a "dialogue result" with:
 *   action: string — what the action executor should do
 *   params: object — parameters for the action
 *   reply: string | null — immediate reply (if no action needed)
 *   needsConfirmation: boolean — whether to prompt user before executing
 */
export async function processDialogue(userId, parsed, ctx) {
  const { intent } = parsed;

  // ── Confirmation responses ──
  if (intent === 'confirm_action') {
    return handleConfirmation(userId, parsed, ctx);
  }

  // ── Create group ──
  if (intent === 'create_group') {
    return handleCreateGroup(userId, parsed, ctx);
  }

  // ── Add member ──
  if (intent === 'add_member') {
    return handleAddMember(userId, parsed, ctx);
  }

  // ── Send invite ──
  if (intent === 'send_invite') {
    return handleSendInvite(userId, parsed, ctx);
  }

  // ── Casual chat ──
  return {
    action: null,
    params: {},
    reply: generateCasualReply(parsed),
    needsConfirmation: false,
  };
}

async function handleConfirmation(userId, parsed, ctx) {
  const pending = ctx.pendingAction;

  if (!pending) {
    return {
      action: null,
      params: {},
      reply: "Nothing pending to confirm. What would you like to do?",
      needsConfirmation: false,
    };
  }

  if (parsed.confirmed === true) {
    await contextManager.clearPendingAction(userId);

    logger.info({ userId, actionType: pending.type }, 'action confirmed');

    return {
      action: pending.type,
      params: pending.params,
      reply: null,
      needsConfirmation: false,
    };
  }

  // User said no/cancel
  await contextManager.clearPendingAction(userId);
  return {
    action: null,
    params: {},
    reply: "No problem, cancelled! What else can I help with?",
    needsConfirmation: false,
  };
}

async function handleCreateGroup(userId, parsed, ctx) {
  const groupName = parsed.group_name;

  if (!groupName) {
    return {
      action: null,
      params: {},
      reply: "What would you like to name the group?",
      needsConfirmation: false,
      awaitingField: 'group_name',
    };
  }

  // Check if there's also a member to add (compound command)
  if (parsed.member_name || parsed.member_email) {
    // Create the group, then set pending add_member
    await contextManager.setPendingAction(userId, {
      type: 'ADD_MEMBER',
      params: {
        member_name: parsed.member_name,
        member_email: parsed.member_email,
      },
    });

    return {
      action: 'CREATE_GROUP',
      params: {
        name: groupName,
        privacy: parsed.privacy || 'private',
        approval_required: parsed.approval_required || false,
        created_by: userId,
        chain_add_member: true,
      },
      reply: null,
      needsConfirmation: false,
    };
  }

  return {
    action: 'CREATE_GROUP',
    params: {
      name: groupName,
      privacy: parsed.privacy || 'private',
      approval_required: parsed.approval_required || false,
      created_by: userId,
    },
    reply: null,
    needsConfirmation: false,
  };
}

async function handleAddMember(userId, parsed, ctx) {
  const email = parsed.member_email;
  const name = parsed.member_name;
  const groupName = parsed.group_name || ctx.currentGroup?.name;
  const groupId = ctx.currentGroup?.id;

  if (!email && !name) {
    return {
      action: null,
      params: {},
      reply: "Who would you like to add? Give me their name or email.",
      needsConfirmation: false,
    };
  }

  if (!email) {
    return {
      action: null,
      params: {},
      reply: `What's ${name}'s email address?`,
      needsConfirmation: false,
      awaitingField: 'member_email',
    };
  }

  if (!groupName && !groupId) {
    return {
      action: null,
      params: {},
      reply: "Which group should I add them to?",
      needsConfirmation: false,
      awaitingField: 'group_name',
    };
  }

  // We have all data — ask for confirmation
  const label = name || email;
  const target = groupName || 'the group';

  await contextManager.setPendingAction(userId, {
    type: 'ADD_MEMBER',
    params: {
      group_id: groupId,
      group_name: groupName,
      member_email: email,
      member_name: name,
    },
  });

  return {
    action: null,
    params: {},
    reply: `Add ${label} to ${target} and send an invite?`,
    needsConfirmation: true,
  };
}

async function handleSendInvite(userId, parsed, ctx) {
  const email = parsed.member_email;
  const groupName = parsed.group_name || ctx.currentGroup?.name;
  const groupId = ctx.currentGroup?.id;

  if (!email) {
    return {
      action: null,
      params: {},
      reply: "What email should I send the invite to?",
      needsConfirmation: false,
    };
  }

  if (!groupName && !groupId) {
    return {
      action: null,
      params: {},
      reply: "Which group is this invite for?",
      needsConfirmation: false,
    };
  }

  await contextManager.setPendingAction(userId, {
    type: 'SEND_INVITE',
    params: {
      group_id: groupId,
      group_name: groupName,
      email,
    },
  });

  return {
    action: null,
    params: {},
    reply: `Send an invite to ${email} for ${groupName}?`,
    needsConfirmation: true,
  };
}

function generateCasualReply(parsed) {
  const raw = parsed.raw || {};
  const text = (raw.user_message || '').toLowerCase();

  if (/how are you|what'?s up|hey|hi|hello/i.test(text)) {
    const replies = [
      "Hey! What can I do for you?",
      "Hi there! Ready to help.",
      "What's up! Need to create a group or add someone?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  if (/thank|thx|ty\b/i.test(text)) {
    return "Anytime! Let me know if you need anything else.";
  }

  if (/bye|later|see ya/i.test(text)) {
    return "Catch you later! I'll be here.";
  }

  return "I can help you create groups, add members, and send invites. Just tell me what you need!";
}
