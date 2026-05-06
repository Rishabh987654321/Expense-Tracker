import IORedis from 'ioredis';
import env from './env.js';

let connection = null;

export function getRedisConnection() {
  if (connection) return connection;
  connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  connection.on('error', (err) => {
    console.warn('[redis] error:', err?.message);
  });
  return connection;
}
