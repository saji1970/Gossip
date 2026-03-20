import { query } from '../config/db.js';
import { logger } from '../config/logger.js';

export async function addMember({ groupId, email, status = 'pending' }) {
  // Idempotent: skip if member already exists
  const existing = await query(
    'SELECT id, status FROM members WHERE group_id = $1 AND LOWER(email) = LOWER($2)',
    [groupId, email],
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (row.status === 'active') {
      throw new Error(`${email} is already an active member`);
    }
    // Already pending — return existing
    logger.info({ groupId, email }, 'member already pending, skipping');
    return { id: row.id, groupId, email, status: row.status, alreadyExisted: true };
  }

  const result = await query(
    `INSERT INTO members (group_id, email, status)
     VALUES ($1, $2, $3)
     RETURNING id, group_id, email, status, joined_at`,
    [groupId, email, status],
  );

  const member = result.rows[0];
  logger.info({ memberId: member.id, groupId, email }, 'member added');

  return {
    id: member.id,
    groupId: member.group_id,
    email: member.email,
    status: member.status,
    joinedAt: member.joined_at,
  };
}

export async function listMembers(groupId) {
  const result = await query(
    'SELECT id, email, status, joined_at FROM members WHERE group_id = $1 ORDER BY joined_at',
    [groupId],
  );
  return result.rows.map((m) => ({
    id: m.id,
    email: m.email,
    status: m.status,
    joinedAt: m.joined_at,
  }));
}

export async function activateMember(groupId, email) {
  const result = await query(
    "UPDATE members SET status = 'active' WHERE group_id = $1 AND LOWER(email) = LOWER($2) RETURNING id",
    [groupId, email],
  );
  return result.rowCount > 0;
}

export async function removeMember(groupId, email) {
  const result = await query(
    'DELETE FROM members WHERE group_id = $1 AND LOWER(email) = LOWER($2)',
    [groupId, email],
  );
  return result.rowCount > 0;
}
