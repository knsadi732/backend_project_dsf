const { Worker } = require('bullmq');
const { connection, QUEUE_NAMES } = require('../queues');
const logger = require('../../utils/logger');

const runDbBackup = require('../../jobs/dbBackup.job');
const runSessionCleanup = require('../../jobs/sessionCleanup.job');
const runReportGeneration = require('../../jobs/reportGeneration.job');
const runNotificationRetry = require('../../jobs/notificationRetry.job');
const runRedisCleanup = require('../../jobs/redisCleanup.job');

const HANDLERS = {
  'db-backup': runDbBackup,
  'session-cleanup': runSessionCleanup,
  'report-generation': runReportGeneration,
  'notification-retry': runNotificationRetry,
  'redis-cleanup': runRedisCleanup,
};

function startSchedulerWorker() {
  return new Worker(
    QUEUE_NAMES.SCHEDULER,
    async (job) => {
      const handler = HANDLERS[job.name];
      if (!handler) {
        logger.warn(`No handler registered for scheduler job: ${job.name}`);
        return;
      }
      return handler();
    },
    { connection },
  );
}

module.exports = startSchedulerWorker;
