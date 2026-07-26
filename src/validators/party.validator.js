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

const VENDOR_TYPES = ['raw_material', 'packaging_material', 'finished_goods', 'service', 'other'];

const createVendor = Joi.object({
  name: Joi.string().max(255).required(),
  phone: Joi.string().max(30).allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  gstin: Joi.string().max(20).allow(null, ''),
  address: Joi.string().allow(null, ''),
  vendorType: Joi.string().valid(...VENDOR_TYPES).allow(null),
  addresses: Joi.array()
    .items(Joi.object({ label: Joi.string().max(100).allow(null, ''), address: Joi.string().required() }))
    .default([]),
  bankAccountNumber: Joi.string().max(50).allow(null, ''),
  bankIfsc: Joi.string().max(20).allow(null, ''),
  bankName: Joi.string().max(150).allow(null, ''),
  creditDays: Joi.number().integer().min(0).default(0),
  creditLimit: Joi.number().min(0).default(0),
  qualityRating: Joi.number().min(0).max(5).allow(null),
  paymentTerms: Joi.string().allow(null, ''),
});

const updateVendor = createVendor.fork(['name'], (s) => s.optional()).keys({
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createCustomer, updateCustomer, createVendor, updateVendor };
