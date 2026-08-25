const Joi = require('joi');

const createSettlement = Joi.object({
  settlementNumber: Joi.string().max(50),
  channelId: Joi.string().guid().required(),
  orderId: Joi.string().guid().allow(null),
  billId: Joi.string().guid().allow(null),
  productVariantId: Joi.string().guid().allow(null),
  settlementDate: Joi.date().iso().required(),
  returnType: Joi.string().valid('none', 'customer', 'courier').default('none'),
  grossSaleAmount: Joi.number().min(0).default(0),
  commissionAmount: Joi.number().min(0).default(0),
  shippingCharge: Joi.number().min(0).default(0),
  returnCharge: Joi.number().min(0).default(0),
  adsCharge: Joi.number().min(0).default(0),
  tcsAmount: Joi.number().min(0).default(0),
  tdsAmount: Joi.number().min(0).default(0),
  netAmountReceived: Joi.number().min(0).default(0),
  remarks: Joi.string().allow(null, ''),
});

module.exports = { createSettlement };
