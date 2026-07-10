const { Queue } = require('bullmq');
const env = require('../config/env');

/** Shared BullMQ connection — kept separate from the app-cache ioredis client per BullMQ's guidance. */
const connection = { host: env.redis.host, port: env.redis.port, password: env.redis.password, maxRetriesPerRequest: null };

const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  SCHEDULER: 'scheduler',
};

const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection });
const schedulerQueue = new Queue(QUEUE_NAMES.SCHEDULER, { connection });

module.exports = { connection, QUEUE_NAMES, notificationQueue, schedulerQueue };
