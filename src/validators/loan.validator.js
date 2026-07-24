const Joi = require('joi');

const createLoan = Joi.object({
  branchId: Joi.string().guid().allow(null),
  loanNumber: Joi.string().max(50),
  lenderName: Joi.string().max(255).required(),
  lenderType: Joi.string().valid('bank', 'vendor', 'other').default('bank'),
  principalAmount: Joi.number().positive().required(),
  interestRate: Joi.number().min(0).max(100).default(0),
  interestType: Joi.string().valid('flat', 'reducing').default('flat'),
  startDate: Joi.date().iso().required(),
  tenureMonths: Joi.number().integer().positive().allow(null),
  remarks: Joi.string().allow(null, ''),
});

const recordRepayment = Joi.object({
  amount: Joi.number().positive().required(),
  principalComponent: Joi.number().min(0).max(Joi.ref('amount')).required(),
  paidAt: Joi.date().iso().allow(null),
  remarks: Joi.string().allow(null, ''),
});

module.exports = { createLoan, recordRepayment };
