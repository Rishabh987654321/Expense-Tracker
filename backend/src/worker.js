import { startEmailWorker } from './workers/email.worker.js';

const worker = startEmailWorker();
console.log('[worker] email worker started.');

const shutdown = async (signal) => {
  console.log(`\n[worker] received ${signal}, draining...`);
  await worker.close();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
