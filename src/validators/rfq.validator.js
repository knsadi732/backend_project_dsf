const Joi = require('joi');

const createRfq = Joi.object({
  branchId: Joi.string().guid().allow(null),
  purchaseRequestId: Joi.string().guid().required(),
  vendorIds: Joi.array().items(Joi.string().guid()).min(1).required(),
  deliveryLocation: Joi.string().allow(null, ''),
  deliveryDate: Joi.date().allow(null),
  paymentTerms: Joi.string().allow(null, ''),
  technicalSpecifications: Joi.string().allow(null, ''),
  remarks: Joi.string().allow(null, ''),
});

const selectVendor = Joi.object({
  vendorQuotationId: Joi.string().guid().required(),
});

module.exports = { createRfq, selectVendor };
