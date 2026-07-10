const Joi = require('joi');

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
  sku: Joi.string().max(100).required(),
  name: Joi.string().max(255).required(),
  description: Joi.string().allow(null, ''),
  uom: Joi.string().max(20),
  unitPrice: Joi.number().min(0),
  costPrice: Joi.number().min(0),
  taxRate: Joi.number().min(0).max(100),
});

const updateProduct = Joi.object({
  categoryId: Joi.string().guid().allow(null),
  name: Joi.string().max(255),
  description: Joi.string().allow(null, ''),
  uom: Joi.string().max(20),
  unitPrice: Joi.number().min(0),
  costPrice: Joi.number().min(0),
  taxRate: Joi.number().min(0).max(100),
  status: Joi.string().valid('active', 'inactive'),
});

const receiveStock = Joi.object({
  warehouseId: Joi.string().guid().required(),
  productId: Joi.string().guid().required(),
  quantity: Joi.number().positive().required(),
});

module.exports = { createCategory, updateCategory, createProduct, updateProduct, receiveStock };
