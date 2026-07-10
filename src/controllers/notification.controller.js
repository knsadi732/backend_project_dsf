const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const notificationService = require('../services/notification.service');

const send = asyncHandler(async (req, res) => {
  const notification = await notificationService.enqueueNotification(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Notification queued.', data: notification, statusCode: 202 });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await notificationService.listNotifications(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Notifications list.', data: rows, meta });
});

module.exports = { send, list };
