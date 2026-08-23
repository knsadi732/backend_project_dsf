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
  transactionDate: Joi.date().iso(),
  partyName: Joi.string().max(255).allow(null, ''),
  utrReference: Joi.string().max(100).allow(null, ''),
  invoiceNumber: Joi.string().max(100).allow(null, ''),
  orderId: Joi.string().max(100).allow(null, ''),
  paymentMode: Joi.string().valid('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'credit_card').allow(null, ''),
  fundingSourceId: Joi.string().guid().allow(null),
  fundingType: Joi.string().valid('advance', 'loan', 'equity', 'other').allow(null, ''),
  paidReceivedBy: Joi.string().guid().allow(null),
  paidReceivedByName: Joi.string().max(255).allow(null, ''),
  gstApplicable: Joi.boolean(),
  gstAmount: Joi.number().min(0),
  gstDetail: Joi.object({
    taxableValue: Joi.number().min(0),
    gstRate: Joi.number().min(0).max(100),
    cgstAmount: Joi.number().min(0),
    sgstAmount: Joi.number().min(0),
    igstAmount: Joi.number().min(0),
    hsnCode: Joi.string().max(20).allow(null, ''),
    placeOfSupplyStateCode: Joi.string().max(2).allow(null, ''),
    partyGstin: Joi.string().max(20).allow(null, ''),
    partyType: Joi.string().valid('b2b', 'b2c'),
  }),
});

const gstDetail = Joi.object({
  applicable: Joi.boolean().default(false),
  taxableValue: Joi.number().min(0),
  gstRate: Joi.number().min(0).max(100),
  gstAmount: Joi.number().min(0),
  cgstAmount: Joi.number().min(0),
  sgstAmount: Joi.number().min(0),
  igstAmount: Joi.number().min(0),
  hsnCode: Joi.string().max(20).allow(null, ''),
  placeOfSupplyStateCode: Joi.string().max(2).allow(null, ''),
  partyGstin: Joi.string().max(20).allow(null, ''),
  partyType: Joi.string().valid('b2b', 'b2c'),
});

const quickEntry = Joi.object({
  transactionNature: Joi.string().valid('sale', 'expense', 'manual').required(),
  transactionDate: Joi.date().iso(),
  amount: Joi.number().positive().required(),
  direction: Joi.string().valid('debit', 'credit').when('transactionNature', { is: 'manual', then: Joi.required() }),
  branchId: Joi.string().guid().allow(null),
  warehouseId: Joi.string().guid().allow(null),
  category: Joi.string().max(100).allow(null, ''),
  description: Joi.string().allow(null, ''),
  partyName: Joi.string().max(255).allow(null, ''),
  utrReference: Joi.string().max(100).allow(null, ''),
  invoiceNumber: Joi.string().max(100).allow(null, ''),
  paymentMode: Joi.string().valid('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'credit_card').allow(null, ''),
  orderId: Joi.string().max(100).allow(null, ''),
  invoiceOrderId: Joi.string().guid().allow(null),
  fundingSourceId: Joi.string().guid().allow(null),
  fundingType: Joi.string().valid('advance', 'loan', 'equity', 'other').allow(null, ''),
  paidReceivedBy: Joi.string().guid().allow(null),
  paidReceivedByName: Joi.string().max(255).allow(null, ''),
  gst: gstDetail,
});

const createFundingSource = Joi.object({
  partyName: Joi.string().max(255).required(),
  partyType: Joi.string().valid('individual', 'bank', 'vendor', 'other'),
  defaultFundingType: Joi.string().valid('advance', 'loan', 'equity', 'other'),
  contactInfo: Joi.string().max(255).allow(null, ''),
});

const printBill = Joi.object({
  orderId: Joi.string().guid().required(),
});

const updateBillStatus = Joi.object({
  status: Joi.string().valid('unpaid', 'partial', 'paid'),
  paidAmount: Joi.number().min(0),
}).or('status', 'paidAmount');

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
  quickEntry,
  createFundingSource,
  printBill,
  updateBillStatus,
  createFiscalPeriod,
  recordStatutoryAudit,
};
