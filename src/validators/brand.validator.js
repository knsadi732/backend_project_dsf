const Joi = require('joi');

const createBrand = Joi.object({
  name: Joi.string().max(150).required(),
  country: Joi.string().max(100).allow(null, ''),
  description: Joi.string().allow(null, ''),
});

const updateBrand = createBrand.fork(['name'], (s) => s.optional()).keys({
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createBrand, updateBrand };
