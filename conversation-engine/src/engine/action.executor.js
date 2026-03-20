import * as groupService from '../services/group.service.js';
import * as memberService from '../services/member.service.js';
import * as inviteService from '../services/invite.service.js';
import * as contextManager from './context.manager.js';
import { logger } from '../config/logger.js';

/**
 * Action Executor — routes dialogue actions to service layer.
 * All actions are idempotent and handle duplicates gracefully.
 *
 * Returns { success, reply, data }
 */
export async function executeAction(userId, action, params) {
  logger.info({ userId, action, params }, 'executing action');

  switch (action) {
    case 'CREATE_GROUP':
      return executeCreateGroup(userId, params);
    case 'ADD_MEMBER':
      return executeAddMember(userId, params);
    case 'SEND_INVITE':
      return executeSendInvite(userId, params);
    default:
      logger.warn({ action }, 'unknown action type');
      return { success: false, reply: "I don't know how to do that yet." };
  }
}

async function executeCreateGroup(userId, params) {
  try {
    const group = await groupService.createGroup({
      name: params.name,
      privacy: params.privacy || 'private',
      approvalRequired: params.approval_required || false,
      createdBy: userId,
    });

    // Set as current group in context
    await contextManager.setCurrentGroup(userId, group.name, group.id);

    let reply = `Group "${group.name}" created!`;
    const nextActions = ['Add members', `Open ${group.name}`];

    // If compound command — chain add_member
    if (params.chain_add_member) {
      const pending = await contextManager.getContext(userId);
      if (pending.pendingAction?.type === 'ADD_MEMBER') {
        const memberParams = {
          ...pending.pendingAction.params,
          group_id: group.id,
          group_name: group.name,
        };
        await contextManager.clearPendingAction(userId);

        const memberResult = await executeAddMember(userId, memberParams);
        if (memberResult.success) {
          reply += ` ${memberResult.reply}`;
        } else {
          reply += ` But I couldn't add the member: ${memberResult.reply}`;
        }

        return {
          success: true,
          reply,
          data: { group, memberResult: memberResult.data },
          nextActions,
        };
      }
    }

    reply += ' Want to add members?';

    return {
      success: true,
      reply,
      data: { group },
      nextActions,
    };
  } catch (err) {
    if (err.message?.includes('already exists')) {
      return { success: false, reply: `A group named "${params.name}" already exists.` };
    }
    logger.error({ err, params }, 'create group failed');
    return { success: false, reply: 'Something went wrong creating the group.' };
  }
}

async function executeAddMember(userId, params) {
  try {
    // Resolve group if we only have a name
    let groupId = params.group_id;
    if (!groupId && params.group_name) {
      const group = await groupService.findGroupByName(userId, params.group_name);
      if (!group) {
        return { success: false, reply: `Couldn't find a group called "${params.group_name}".` };
      }
      groupId = group.id;
    }

    if (!groupId) {
      return { success: false, reply: "I need to know which group to add them to." };
    }

    const member = await memberService.addMember({
      groupId,
      email: params.member_email,
      status: 'pending',
    });

    // Queue invite email
    const invite = await inviteService.createAndQueueInvite({
      email: params.member_email,
      groupId,
      groupName: params.group_name,
      inviterUserId: userId,
    });

    const label = params.member_name || params.member_email;
    const reply = invite.emailQueued
      ? `${label} added! Invite email queued.`
      : `${label} added!`;

    // Update current group context
    if (params.group_name) {
      await contextManager.setCurrentGroup(userId, params.group_name, groupId);
    }

    return {
      success: true,
      reply,
      data: { member, invite },
      nextActions: ['Add another member', `Open ${params.group_name || 'the group'}`],
    };
  } catch (err) {
    if (err.message?.includes('already')) {
      const label = params.member_name || params.member_email;
      return { success: false, reply: `${label} is already in that group.` };
    }
    logger.error({ err, params }, 'add member failed');
    return { success: false, reply: 'Something went wrong adding the member.' };
  }
}

async function executeSendInvite(userId, params) {
  try {
    let groupId = params.group_id;
    if (!groupId && params.group_name) {
      const group = await groupService.findGroupByName(userId, params.group_name);
      if (!group) {
        return { success: false, reply: `Couldn't find a group called "${params.group_name}".` };
      }
      groupId = group.id;
    }

    const invite = await inviteService.createAndQueueInvite({
      email: params.email,
      groupId,
      groupName: params.group_name,
      inviterUserId: userId,
    });

    return {
      success: true,
      reply: `Invite sent to ${params.email}!`,
      data: { invite },
    };
  } catch (err) {
    logger.error({ err, params }, 'send invite failed');
    return { success: false, reply: 'Something went wrong sending the invite.' };
  }
}
