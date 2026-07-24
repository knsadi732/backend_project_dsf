const Joi = require('joi');
const { PURCHASE_REQUEST_PRIORITY } = require('../constants/enums');

const createPurchaseRequest = Joi.object({
  branchId: Joi.string().guid().allow(null),
  prNumber: Joi.string().max(50),
  warehouseId: Joi.string().guid().required(),
  departmentId: Joi.string().guid().allow(null),
  priority: Joi.string()
    .valid(...Object.values(PURCHASE_REQUEST_PRIORITY))
    .default(PURCHASE_REQUEST_PRIORITY.MEDIUM),
  requiredDate: Joi.date().allow(null),
  remarks: Joi.string().allow(null, ''),
  items: Joi.array()
    .items(
      Joi.object({
        productVariantId: Joi.string().guid().required(),
        quantity: Joi.number().positive().required(),
        remarks: Joi.string().allow(null, ''),
      }),
    )
    .min(1)
    .required(),
});

const decideStatus = Joi.object({
  status: Joi.string().valid('submitted', 'pending_approval', 'approved', 'rejected', 'converted_to_rfq').required(),
});

module.exports = { createPurchaseRequest, decideStatus };
