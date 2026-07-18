const Joi = require('joi');

const createPurchaseRequest = Joi.object({
  branchId: Joi.string().guid().allow(null),
  prNumber: Joi.string().max(50),
  warehouseId: Joi.string().guid().required(),
  departmentId: Joi.string().guid().allow(null),
  remarks: Joi.string().allow(null, ''),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().guid().required(),
        quantity: Joi.number().positive().required(),
        remarks: Joi.string().allow(null, ''),
      }),
    )
    .min(1)
    .required(),
});

const decideStatus = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
});

module.exports = { createPurchaseRequest, decideStatus };
