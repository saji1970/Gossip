import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { enqueueInvite } from '../queues/queue.js';

const INVITE_EXPIRY = '24h';

export async function createAndQueueInvite({ email, groupId, groupName, inviterUserId }) {
  // Generate JWT invite token
  const token = jwt.sign(
    { email, groupId, inviterUserId },
    config.jwtSecret,
    { expiresIn: INVITE_EXPIRY },
  );

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Idempotent: check for existing unexpired, unused invite
  const existing = await query(
    `SELECT id, token FROM invites
     WHERE LOWER(email) = LOWER($1) AND group_id = $2 AND used = false AND expires_at > NOW()`,
    [email, groupId],
  );

  let inviteId;
  let inviteToken;

  if (existing.rows.length > 0) {
    // Reuse existing invite
    inviteId = existing.rows[0].id;
    inviteToken = existing.rows[0].token;
    logger.info({ email, groupId }, 'reusing existing invite');
  } else {
    const result = await query(
      `INSERT INTO invites (email, group_id, token, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [email, groupId, token, expiresAt],
    );
    inviteId = result.rows[0].id;
    inviteToken = token;
    logger.info({ inviteId, email, groupId }, 'invite created');
  }

  // Queue email job (never send directly from API)
  let emailQueued = false;
  try {
    await enqueueInvite({
      inviteId,
      email,
      groupName: groupName || 'a group',
      inviteLink: `${config.inviteBaseUrl}?token=${inviteToken}`,
    });
    emailQueued = true;
  } catch (err) {
    logger.warn({ err, email }, 'failed to queue invite email');
  }

  return {
    id: inviteId,
    email,
    groupId,
    token: inviteToken,
    expiresAt,
    emailQueued,
  };
}

export async function validateInvite(token) {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    const result = await query(
      'SELECT id, email, group_id, used, expires_at FROM invites WHERE token = $1',
      [token],
    );

    if (result.rows.length === 0) {
      return { valid: false, reason: 'Invite not found' };
    }

    const invite = result.rows[0];

    if (invite.used) {
      return { valid: false, reason: 'Invite already used' };
    }

    if (new Date(invite.expires_at) < new Date()) {
      return { valid: false, reason: 'Invite expired' };
    }

    return {
      valid: true,
      email: invite.email,
      groupId: invite.group_id,
      inviteId: invite.id,
    };
  } catch {
    return { valid: false, reason: 'Invalid token' };
  }
}

export async function markInviteUsed(inviteId) {
  await query('UPDATE invites SET used = true WHERE id = $1', [inviteId]);
}
