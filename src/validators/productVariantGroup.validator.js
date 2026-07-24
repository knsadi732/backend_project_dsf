const Joi = require('joi');

const createGroup = Joi.object({
  productId: Joi.string().guid().required(),
  groupSku: Joi.string().max(100).required(),
  variantName: Joi.string().max(150).required(),
  color: Joi.string().max(50).allow(null, ''),
});

const updateGroup = Joi.object({
  variantName: Joi.string().max(150),
  color: Joi.string().max(50).allow(null, ''),
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createGroup, updateGroup };
