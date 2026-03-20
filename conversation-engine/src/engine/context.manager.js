import { redis } from '../config/redis.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

const PREFIX = 'ctx:';
const TTL = config.redis.contextTtl;

function key(userId) {
  return `${PREFIX}${userId}`;
}

export async function getContext(userId) {
  const raw = await redis.get(key(userId));
  if (!raw) {
    return {
      userId,
      currentGroup: null,
      pendingAction: null,
      lastIntent: null,
      history: [],
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { userId, currentGroup: null, pendingAction: null, lastIntent: null, history: [] };
  }
}

export async function setContext(userId, ctx) {
  const data = { ...ctx, updatedAt: Date.now() };

  // Keep history capped at 20 entries
  if (data.history && data.history.length > 20) {
    data.history = data.history.slice(-20);
  }

  await redis.set(key(userId), JSON.stringify(data), 'EX', TTL);
  logger.debug({ userId, pendingAction: data.pendingAction?.type }, 'context updated');
}

export async function clearContext(userId) {
  await redis.del(key(userId));
  logger.debug({ userId }, 'context cleared');
}

export async function setPendingAction(userId, action) {
  const ctx = await getContext(userId);
  ctx.pendingAction = { ...action, createdAt: Date.now() };
  await setContext(userId, ctx);
}

export async function clearPendingAction(userId) {
  const ctx = await getContext(userId);
  ctx.pendingAction = null;
  await setContext(userId, ctx);
}

export async function addToHistory(userId, role, content) {
  const ctx = await getContext(userId);
  ctx.history = ctx.history || [];
  ctx.history.push({ role, content, timestamp: Date.now() });
  await setContext(userId, ctx);
}

export async function setCurrentGroup(userId, groupName, groupId) {
  const ctx = await getContext(userId);
  ctx.currentGroup = { name: groupName, id: groupId };
  await setContext(userId, ctx);
}
