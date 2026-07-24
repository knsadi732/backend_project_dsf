const Joi = require('joi');

const PRODUCT_TYPES = ['finished_goods', 'raw_material', 'packaging_material', 'semi_finished_goods', 'consumable', 'service'];

const createCategory = Joi.object({
  parentId: Joi.string().guid().allow(null),
  name: Joi.string().max(150).required(),
});

const updateCategory = Joi.object({
  name: Joi.string().max(150),
  status: Joi.string().valid('active', 'inactive'),
});

const createProduct = Joi.object({
  categoryId: Joi.string().guid().allow(null),
  brandId: Joi.string().guid().allow(null),
  name: Joi.string().max(255).required(),
  description: Joi.string().allow(null, ''),
  uom: Joi.string().max(20),
  hsnCode: Joi.string().max(20).allow(null, ''),
  gstPercentage: Joi.number().min(0).max(100),
  productType: Joi.string().valid(...PRODUCT_TYPES),
  bomRequired: Joi.boolean(),
  productionRequired: Joi.boolean(),
  packagingRequired: Joi.boolean(),
});

const updateProduct = Joi.object({
  categoryId: Joi.string().guid().allow(null),
  brandId: Joi.string().guid().allow(null),
  name: Joi.string().max(255),
  description: Joi.string().allow(null, ''),
  uom: Joi.string().max(20),
  hsnCode: Joi.string().max(20).allow(null, ''),
  gstPercentage: Joi.number().min(0).max(100),
  productType: Joi.string().valid(...PRODUCT_TYPES),
  bomRequired: Joi.boolean(),
  productionRequired: Joi.boolean(),
  packagingRequired: Joi.boolean(),
  status: Joi.string().valid('active', 'inactive', 'discontinued'),
});

const receiveStock = Joi.object({
  warehouseId: Joi.string().guid().required(),
  productVariantId: Joi.string().guid().required(),
  quantity: Joi.number().positive().required(),
});

module.exports = { createCategory, updateCategory, createProduct, updateProduct, receiveStock };
