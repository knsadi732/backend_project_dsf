const { Worker } = require('bullmq');
const { connection, QUEUE_NAMES } = require('../queues');
const notificationRepository = require('../../repositories/notification.repository');
const notificationTemplateRepository = require('../../repositories/notificationTemplate.repository');
const notificationService = require('../../services/notification.service');
const mailer = require('../../utils/mailer');
const { wrapWithLetterhead } = require('../../utils/emailLetterhead');
const logger = require('../../utils/logger');

/**
 * 'email' goes out over real SMTP (see src/utils/mailer.js); sms/push are still
 * simulated — swap in a real provider call here when one is wired up.
 */
async function deliver(notification, subject, renderedBody) {
  if (notification.channel === 'email') {
    await mailer.sendMail({
      to: notification.recipient,
      subject,
      text: renderedBody,
      html: wrapWithLetterhead(renderedBody),
    });
    return;
  }
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
      const subject = template?.subject ? notificationService.render(template.subject, notification.payload) : '';
      const body = template ? notificationService.render(template.body_template, notification.payload) : '';

      try {
        await deliver(notification, subject, body);
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
