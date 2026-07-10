const Joi = require('joi');

const send = Joi.object({
  userId: Joi.string().guid().allow(null),
  channel: Joi.string().valid('email', 'sms', 'push').required(),
  templateKey: Joi.string().max(150).required(),
  recipient: Joi.string().max(255).required(),
  payload: Joi.object().unknown(true),
});

module.exports = { send };
