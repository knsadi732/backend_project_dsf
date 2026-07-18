const Joi = require('joi');

const recordTransaction = Joi.object({
  branchId: Joi.string().guid().allow(null),
  transactionDate: Joi.date().iso(),
  referenceType: Joi.string().valid('order', 'purchase_order', 'expense', 'manual').required(),
  referenceId: Joi.string().guid().allow(null),
  direction: Joi.string().valid('debit', 'credit').required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().allow(null, ''),
});

const issuePaymentSlip = Joi.object({
  orderId: Joi.string().guid().allow(null),
  customerId: Joi.string().guid().required(),
  amount: Joi.number().positive().required(),
  paymentMode: Joi.string().valid('cash', 'upi', 'card', 'bank_transfer'),
});

const recordExpense = Joi.object({
  warehouseId: Joi.string().guid().allow(null),
  category: Joi.string().max(100).required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().allow(null, ''),
});

const printBill = Joi.object({
  orderId: Joi.string().guid().required(),
});

const createFiscalPeriod = Joi.object({
  periodStart: Joi.date().iso().required(),
  periodEnd: Joi.date().iso().min(Joi.ref('periodStart')).required(),
});

const recordStatutoryAudit = Joi.object({
  fiscalPeriodId: Joi.string().guid().allow(null),
  auditorName: Joi.string().max(255).required(),
  conductedAt: Joi.date().iso().required(),
  findings: Joi.string().allow(null, ''),
  remarks: Joi.string().allow(null, ''),
});

module.exports = {
  recordTransaction,
  issuePaymentSlip,
  recordExpense,
  printBill,
  createFiscalPeriod,
  recordStatutoryAudit,
};
