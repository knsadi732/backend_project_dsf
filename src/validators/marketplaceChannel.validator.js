const Joi = require('joi');

const createChannel = Joi.object({
  name: Joi.string().max(100).required(),
  defaultCommissionPercent: Joi.number().min(0).max(100).default(0),
  defaultCostPerUnit: Joi.number().min(0).default(0),
  assumedCustomerReturnPercent: Joi.number().min(0).max(100).default(0),
  assumedRtoPercent: Joi.number().min(0).max(100).default(0),
  marginMin: Joi.number().min(0).default(0),
  marginMax: Joi.number().min(0).default(0),
  remarks: Joi.string().allow(null, ''),
});

const updateChannel = Joi.object({
  defaultCommissionPercent: Joi.number().min(0).max(100),
  defaultCostPerUnit: Joi.number().min(0),
  assumedCustomerReturnPercent: Joi.number().min(0).max(100),
  assumedRtoPercent: Joi.number().min(0).max(100),
  marginMin: Joi.number().min(0),
  marginMax: Joi.number().min(0),
  isActive: Joi.boolean(),
  remarks: Joi.string().allow(null, ''),
});

module.exports = { createChannel, updateChannel };
