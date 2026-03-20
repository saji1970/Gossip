import { chat } from '../engine/conversation.engine.js';
import { validateInvite, markInviteUsed } from '../services/invite.service.js';
import * as memberService from '../services/member.service.js';
import * as contextManager from '../engine/context.manager.js';
import { logger } from '../config/logger.js';

export async function handleChat(req, res) {
  const { userId, message } = req.validatedBody;

  try {
    const result = await chat(userId, message);

    logger.info({
      userId,
      intent: result.intent,
      action: result.action,
      success: result.success,
      latency: result.latency,
    }, 'chat response');

    return res.json({
      reply: result.reply,
      intent: result.intent,
      action: result.action || null,
      success: result.success ?? true,
      data: result.data || {},
      nextActions: result.nextActions || [],
      needsConfirmation: result.needsConfirmation || false,
    });
  } catch (err) {
    logger.error({ err, userId, message: message.slice(0, 80) }, 'chat handler error');
    return res.status(500).json({
      reply: "Something went wrong. Please try again.",
      error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
}

export async function handleAcceptInvite(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing invite token' });
  }

  try {
    const result = await validateInvite(token);

    if (!result.valid) {
      return res.status(400).json({ error: result.reason });
    }

    // Activate the member
    await memberService.activateMember(result.groupId, result.email);
    await markInviteUsed(result.inviteId);

    return res.json({
      success: true,
      email: result.email,
      groupId: result.groupId,
      message: 'Invite accepted! You are now a member.',
    });
  } catch (err) {
    logger.error({ err }, 'accept invite error');
    return res.status(500).json({ error: 'Failed to accept invite' });
  }
}

export async function handleGetContext(req, res) {
  const userId = req.params.userId || req.userId;

  try {
    const ctx = await contextManager.getContext(userId);
    return res.json(ctx);
  } catch (err) {
    logger.error({ err, userId }, 'get context error');
    return res.status(500).json({ error: 'Failed to get context' });
  }
}

export async function handleClearContext(req, res) {
  const userId = req.params.userId || req.userId;

  try {
    await contextManager.clearContext(userId);
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, 'clear context error');
    return res.status(500).json({ error: 'Failed to clear context' });
  }
}
