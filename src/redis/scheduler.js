const { schedulerQueue } = require('./queues');
const logger = require('../utils/logger');

/**
 * Registers the five Service-05 repeatable jobs against the scheduler queue.
 * Cron patterns are UTC; BullMQ dedupes on job name + repeat config so this
 * is safe to call on every worker boot.
 */
const JOB_SCHEDULE = [
  { name: 'db-backup', pattern: '0 2 * * *' }, // daily 02:00
  { name: 'session-cleanup', pattern: '*/30 * * * *' }, // every 30 min
  { name: 'report-generation', pattern: '0 1 * * *' }, // daily 01:00
  { name: 'notification-retry', pattern: '*/15 * * * *' }, // every 15 min
  { name: 'redis-cleanup', pattern: '0 * * * *' }, // hourly
];

async function registerSchedulerJobs() {
  for (const { name, pattern } of JOB_SCHEDULE) {
    await schedulerQueue.add(name, {}, { repeat: { pattern }, jobId: name });
  }
  logger.info(`Scheduler jobs registered: ${JOB_SCHEDULE.map((j) => j.name).join(', ')}`);
}

module.exports = { registerSchedulerJobs, JOB_SCHEDULE };
