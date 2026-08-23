const Joi = require('joi');

const createRack = Joi.object({
  zoneId: Joi.string().guid().required(),
  code: Joi.string().max(100).required(),
  maxCapacity: Joi.number().min(0),
});

const updateRack = Joi.object({
  code: Joi.string().max(100),
  maxCapacity: Joi.number().min(0),
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createRack, updateRack };
