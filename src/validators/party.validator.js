const Joi = require('joi');

const createCustomer = Joi.object({
  name: Joi.string().max(255).required(),
  phone: Joi.string().max(30).allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  gstin: Joi.string().max(20).allow(null, ''),
  billingAddress: Joi.string().allow(null, ''),
  shippingAddress: Joi.string().allow(null, ''),
});

const updateCustomer = createCustomer.fork(['name'], (s) => s.optional()).keys({
  status: Joi.string().valid('active', 'inactive'),
});

const createVendor = Joi.object({
  name: Joi.string().max(255).required(),
  phone: Joi.string().max(30).allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  gstin: Joi.string().max(20).allow(null, ''),
  address: Joi.string().allow(null, ''),
});

const updateVendor = createVendor.fork(['name'], (s) => s.optional()).keys({
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createCustomer, updateCustomer, createVendor, updateVendor };
