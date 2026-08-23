const Joi = require('joi');

// Vendor payment: the same body vendor-bill payment normally takes,
// captured here instead of posted directly — approval executes the real
// POST /vendor-bills/:id/payment logic once approved.
const createVendorPaymentRequest = Joi.object({
  vendorBillId: Joi.string().guid().required(),
  amount: Joi.number().positive().required(),
  utrNumber: Joi.string().required(),
  remarks: Joi.string().allow(null, ''),
});

// Credit limit override: requested new limit for a customer, pending
// approval before customer.credit_limit actually changes.
const createCreditLimitOverrideRequest = Joi.object({
  customerId: Joi.string().guid().required(),
  requestedLimit: Joi.number().min(0).required(),
  remarks: Joi.string().allow(null, ''),
});

module.exports = { createVendorPaymentRequest, createCreditLimitOverrideRequest };
