const { Worker } = require('bullmq');
const { connection, QUEUE_NAMES } = require('../queues');
const notificationRepository = require('../../repositories/notification.repository');
const notificationTemplateRepository = require('../../repositories/notificationTemplate.repository');
const notificationService = require('../../services/notification.service');
const logger = require('../../utils/logger');

/**
 * Simulated delivery — swap this for a real email/SMS/push provider call.
 * Isolated here so plugging in a provider only touches this function.
 */
async function deliver(notification, renderedBody) {
  logger.info(`[notification:${notification.channel}] -> ${notification.recipient}: ${renderedBody}`);
}

function startNotificationWorker() {
  return new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      const { notificationId } = job.data;
      const notification = await notificationRepository.findById(notificationId);
      if (!notification) return;

      const template = await notificationTemplateRepository.findByKey(notification.template_key);
      const body = template ? notificationService.render(template.body_template, notification.payload) : '';

      try {
        await deliver(notification, body);
        await notificationRepository.markSent(notificationId);
      } catch (err) {
        await notificationRepository.markFailed(notificationId, err.message);
        throw err; // rethrow so BullMQ applies the configured exponential backoff retry
      }
    },
    { connection },
  );
}

module.exports = startNotificationWorker;
