const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const appNotificationService = require('../services/appNotification.service');

const create = asyncHandler(async (req, res) => {
  const notification = await appNotificationService.createNotification(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Notification created.', data: notification, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await appNotificationService.listNotifications(req.tenant.companyId, req.user.id, req.pagination, {
    status: req.query.status,
  });
  return sendSuccess(res, { message: 'Notifications list.', data: rows, meta });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await appNotificationService.markRead(req.tenant.companyId, req.user.id, req.params.id);
  return sendSuccess(res, { message: 'Notification marked read.', data: notification });
});

const archive = asyncHandler(async (req, res) => {
  const notification = await appNotificationService.archive(req.tenant.companyId, req.user.id, req.params.id);
  return sendSuccess(res, { message: 'Notification archived.', data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await appNotificationService.markAllRead(req.tenant.companyId, req.user.id);
  return sendSuccess(res, { message: 'All notifications marked read.', data: {} });
});

module.exports = { create, list, markRead, archive, markAllRead };
