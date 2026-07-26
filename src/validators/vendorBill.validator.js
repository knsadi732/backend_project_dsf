const Joi = require('joi');

const recordPayment = Joi.object({
  amount: Joi.number().positive().required(),
  utrNumber: Joi.string().max(100).required(),
});

module.exports = { recordPayment };
