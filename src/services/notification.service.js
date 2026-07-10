const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const { notificationQueue } = require('../redis/queues');
const notificationRepository = require('../repositories/notification.repository');
const notificationTemplateRepository = require('../repositories/notificationTemplate.repository');

/** {{variable}} interpolation (plan.md Service-06 — Template Core Engine). */
function render(template, payload = {}) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key) => (payload[key] !== undefined ? String(payload[key]) : ''));
}

/**
 * Persists the notification row then hands delivery to the Redis queue —
 * never sends synchronously inline (plan.md Chapter 3, Service-06). The
 * worker (src/redis/workers/notification.worker.js) performs the actual send.
 */
async function enqueueNotification(companyId, { userId, channel, templateKey, recipient, payload }, actorId) {
  const template = await notificationTemplateRepository.findByKey(templateKey);
  if (!template) throw new AppError('COMMON_001', [], `Unknown notification template: ${templateKey}`);

  const notification = await notificationRepository.create(companyId, { userId, channel, templateKey, recipient, payload }, actorId);

  await notificationQueue.add(
    'send',
    { notificationId: notification.id },
    { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
  );

  return notification;
}

async function listNotifications(companyId, pagination) {
  const { rows, totalRecords } = await notificationRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

module.exports = { render, enqueueNotification, listNotifications };
