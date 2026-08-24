const Joi = require('joi');

const createPayable = Joi.object({
  branchId: Joi.string().guid().allow(null),
  payableNumber: Joi.string().max(50),
  partyName: Joi.string().max(255).required(),
  purpose: Joi.string().max(255).required(),
  totalAmount: Joi.number().positive().required(),
  dueDate: Joi.date().iso().allow(null),
  remarks: Joi.string().allow(null, ''),
});

const recordPayment = Joi.object({
  amount: Joi.number().positive().required(),
  paidAt: Joi.date().iso().allow(null),
  remarks: Joi.string().allow(null, ''),
});

module.exports = { createPayable, recordPayment };
