const Joi = require('joi');

const createBomLine = Joi.object({
  productId: Joi.string().guid().required(),
  rawMaterialVariantId: Joi.string().guid().required(),
  quantityPerUnit: Joi.number().positive().required(),
  remarks: Joi.string().allow(null, ''),
});

const updateBomLine = Joi.object({
  quantityPerUnit: Joi.number().positive(),
  remarks: Joi.string().allow(null, ''),
});

module.exports = { createBomLine, updateBomLine };
