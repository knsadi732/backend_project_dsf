const Joi = require('joi');

const createAppNotification = Joi.object({
  userId: Joi.string().guid().allow(null),
  title: Joi.string().max(255).required(),
  message: Joi.string().allow(null, ''),
  type: Joi.string().valid('information', 'success', 'warning', 'error', 'approval', 'reminder'),
  category: Joi.string().max(100).allow(null, ''),
  entityId: Joi.string().guid().allow(null),
});

module.exports = { createAppNotification };
