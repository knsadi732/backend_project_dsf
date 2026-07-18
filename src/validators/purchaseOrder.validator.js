const Joi = require('joi');

const createPurchaseOrder = Joi.object({
  branchId: Joi.string().guid().allow(null),
  poNumber: Joi.string().max(50),
  warehouseId: Joi.string().guid().required(),
  vendorId: Joi.string().guid().required(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().guid().required(),
        quantity: Joi.number().positive().required(),
        unitCost: Joi.number().min(0).required(),
      }),
    )
    .min(1)
    .required(),
});

const transitionStatus = Joi.object({
  status: Joi.string().valid('approved', 'ordered', 'received', 'completed').required(),
});

module.exports = { createPurchaseOrder, transitionStatus };
