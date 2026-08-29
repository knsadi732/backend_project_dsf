const Joi = require('joi');

const createPurchaseOrder = Joi.object({
  branchId: Joi.string().guid().allow(null),
  rfqId: Joi.string().guid().allow(null),
  purchaseRequestId: Joi.string().guid().required(),
  warehouseId: Joi.string().guid().required(),
  vendorId: Joi.string().guid().required(),
  deliveryAddress: Joi.string().allow(null, ''),
  taxAmount: Joi.number().min(0).default(0),
  paymentTerms: Joi.string().max(255).allow(null, ''),
  expectedDeliveryDate: Joi.date().allow(null),
  // Exactly one of productVariantId / itemId per line — see Chapter 8/12
  // (Item & Material Master rows can now be ordered through Purchase too).
  items: Joi.array()
    .items(
      Joi.object({
        productVariantId: Joi.string().guid(),
        itemId: Joi.string().guid(),
        quantity: Joi.number().positive().required(),
        unitCost: Joi.number().min(0).required(),
      }).xor('productVariantId', 'itemId'),
    )
    .min(1)
    .required(),
});

const transitionStatus = Joi.object({
  status: Joi.string()
    .valid('pending_approval', 'approved', 'sent', 'acknowledged', 'partially_received', 'completed', 'cancelled')
    .required(),
});

module.exports = { createPurchaseOrder, transitionStatus };
