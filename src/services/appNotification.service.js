const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const appNotificationRepository = require('../repositories/appNotification.repository');

async function createNotification(companyId, payload, actorId) {
  return appNotificationRepository.create(companyId, payload, actorId);
}

async function listNotifications(companyId, userId, pagination, filters) {
  const { rows, totalRecords } = await appNotificationRepository.list(companyId, userId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function markRead(companyId, userId, id) {
  const notification = await appNotificationRepository.setStatus(companyId, userId, id, 'read');
  if (!notification) throw new AppError('COMMON_001', [], 'Notification not found.');
  return notification;
}

async function archive(companyId, userId, id) {
  const notification = await appNotificationRepository.setStatus(companyId, userId, id, 'archived');
  if (!notification) throw new AppError('COMMON_001', [], 'Notification not found.');
  return notification;
}

async function markAllRead(companyId, userId) {
  await appNotificationRepository.markAllRead(companyId, userId);
}

module.exports = { createNotification, listNotifications, markRead, archive, markAllRead };
