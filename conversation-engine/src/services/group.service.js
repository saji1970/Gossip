import { query, transaction } from '../config/db.js';
import { logger } from '../config/logger.js';

export async function createGroup({ name, privacy, approvalRequired, createdBy }) {
  // Idempotent: check for existing group with same name by same user
  const existing = await query(
    'SELECT id, name FROM groups WHERE LOWER(name) = LOWER($1) AND created_by = $2',
    [name, createdBy],
  );

  if (existing.rows.length > 0) {
    throw new Error(`A group named "${name}" already exists`);
  }

  const result = await query(
    `INSERT INTO groups (name, privacy, approval_required, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, privacy, approval_required, created_by, created_at`,
    [name, privacy, approvalRequired, createdBy],
  );

  const group = result.rows[0];

  logger.info({ groupId: group.id, name, createdBy }, 'group created');

  return {
    id: group.id,
    name: group.name,
    privacy: group.privacy,
    approvalRequired: group.approval_required,
    createdBy: group.created_by,
    createdAt: group.created_at,
  };
}

export async function findGroupByName(userId, name) {
  const result = await query(
    'SELECT id, name, privacy, approval_required, created_by FROM groups WHERE LOWER(name) = LOWER($1) AND created_by = $2',
    [name, userId],
  );
  if (result.rows.length === 0) return null;
  const g = result.rows[0];
  return {
    id: g.id,
    name: g.name,
    privacy: g.privacy,
    approvalRequired: g.approval_required,
    createdBy: g.created_by,
  };
}

export async function findGroupById(groupId) {
  const result = await query('SELECT * FROM groups WHERE id = $1', [groupId]);
  if (result.rows.length === 0) return null;
  const g = result.rows[0];
  return {
    id: g.id,
    name: g.name,
    privacy: g.privacy,
    approvalRequired: g.approval_required,
    createdBy: g.created_by,
  };
}

export async function listGroupsByUser(userId) {
  const result = await query(
    'SELECT id, name, privacy, approval_required, created_by, created_at FROM groups WHERE created_by = $1 ORDER BY created_at DESC',
    [userId],
  );
  return result.rows.map((g) => ({
    id: g.id,
    name: g.name,
    privacy: g.privacy,
    approvalRequired: g.approval_required,
    createdBy: g.created_by,
    createdAt: g.created_at,
  }));
}

export async function deleteGroup(groupId, userId) {
  return transaction(async (client) => {
    const check = await client.query(
      'SELECT id FROM groups WHERE id = $1 AND created_by = $2',
      [groupId, userId],
    );
    if (check.rows.length === 0) return false;

    await client.query('DELETE FROM invites WHERE group_id = $1', [groupId]);
    await client.query('DELETE FROM members WHERE group_id = $1', [groupId]);
    await client.query('DELETE FROM groups WHERE id = $1', [groupId]);
    return true;
  });
}
