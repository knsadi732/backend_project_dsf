const logger = require('./utils/logger');
const startNotificationWorker = require('./redis/workers/notification.worker');
const startSchedulerWorker = require('./redis/workers/scheduler.worker');
const { registerSchedulerJobs } = require('./redis/scheduler');

/**
 * Standalone worker process (Service-05/06) — run separately from the HTTP
 * server via `npm run worker` so job processing never competes with request
 * handling on the same event loop.
 */
async function main() {
  const notificationWorker = startNotificationWorker();
  const schedulerWorker = startSchedulerWorker();
  await registerSchedulerJobs();

  notificationWorker.on('failed', (job, err) => logger.error(`Notification job ${job?.id} failed`, err));
  schedulerWorker.on('failed', (job, err) => logger.error(`Scheduler job ${job?.name} failed`, err));

  logger.info('Worker process started (notifications + scheduler queues).');
}

main().catch((err) => {
  logger.error('Worker process failed to start', err);
  process.exit(1);
});
