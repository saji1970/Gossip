import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

const inviteQueue = new Queue('invite-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export async function enqueueInvite({ inviteId, email, groupName, inviteLink }) {
  const job = await inviteQueue.add('send-invite-email', {
    inviteId,
    email,
    groupName,
    inviteLink,
  });

  logger.info({ jobId: job.id, email, groupName }, 'invite email job queued');
  return job;
}

export { inviteQueue };
