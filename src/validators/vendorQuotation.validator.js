const Joi = require('joi');

const recordVendorQuotation = Joi.object({
  rfqId: Joi.string().guid().required(),
  vendorId: Joi.string().guid().required(),
  deliveryTimeDays: Joi.number().integer().min(0).allow(null),
  paymentTerms: Joi.string().allow(null, ''),
  validityDate: Joi.date().allow(null),
  freightAmount: Joi.number().min(0).default(0),
  discountAmount: Joi.number().min(0).default(0),
  remarks: Joi.string().allow(null, ''),
  items: Joi.array()
    .items(
      Joi.object({
        productVariantId: Joi.string().guid().required(),
        unitPrice: Joi.number().min(0).required(),
        gstPercentage: Joi.number().min(0).max(100).default(0),
      }),
    )
    .min(1)
    .required(),
});

module.exports = { recordVendorQuotation };
