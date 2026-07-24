const Joi = require('joi');

const createVariant = Joi.object({
  productId: Joi.string().guid().required(),
  variantGroupId: Joi.string().guid().allow(null),
  sku: Joi.string().max(100),
  barcode: Joi.string().max(100).allow(null, ''),
  size: Joi.string().max(30).allow(null, ''),
  color: Joi.string().max(50).allow(null, ''),
  weight: Joi.number().min(0).allow(null),
  mrp: Joi.number().min(0),
  sellingPrice: Joi.number().min(0),
  wholesalePrice: Joi.number().min(0).allow(null),
  dealerPrice: Joi.number().min(0).allow(null),
  costPrice: Joi.number().min(0),
});

const updateVariant = Joi.object({
  variantGroupId: Joi.string().guid().allow(null),
  barcode: Joi.string().max(100).allow(null, ''),
  size: Joi.string().max(30).allow(null, ''),
  color: Joi.string().max(50).allow(null, ''),
  weight: Joi.number().min(0).allow(null),
  mrp: Joi.number().min(0),
  sellingPrice: Joi.number().min(0),
  wholesalePrice: Joi.number().min(0).allow(null),
  dealerPrice: Joi.number().min(0).allow(null),
  costPrice: Joi.number().min(0),
  status: Joi.string().valid('active', 'inactive', 'discontinued'),
});

module.exports = { createVariant, updateVariant };
