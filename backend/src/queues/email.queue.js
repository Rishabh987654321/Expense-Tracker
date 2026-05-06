import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

export const EMAIL_QUEUE_NAME = 'emails';

let queue = null;

function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function getQueue() {
  if (queue) return queue;
  queue = new Queue(EMAIL_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
  return queue;
}

// Enqueue an email job. Failure to enqueue (e.g. Redis offline) does NOT
// fail the originating request — emails are best-effort. We log a warning
// instead.
export async function enqueueEmail(type, payload) {
  try {
    await withTimeout(getQueue().add(type, payload), 1500, `enqueueEmail(${type})`);
  } catch (err) {
    console.warn(`[email-queue] failed to enqueue ${type}:`, err?.message);
  }
}
