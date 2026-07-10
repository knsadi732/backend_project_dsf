const { notificationQueue } = require('../redis/queues');
const notificationRepository = require('../repositories/notification.repository');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 5;

/** Notification Retry (plan.md Service-05): re-enqueues failed sends within their retry budget. */
async function runNotificationRetry() {
  const pending = await notificationRepository.findFailedForRetry(MAX_ATTEMPTS);

  for (const notification of pending) {
    await notificationQueue.add(
      'send',
      { notificationId: notification.id },
      { attempts: 1, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  logger.info(`Notification retry re-queued ${pending.length} notification(s).`);
  return { requeued: pending.length };
}

module.exports = runNotificationRetry;
