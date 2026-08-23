const Joi = require('joi');

const ZONE_TYPES = ['receiving', 'storage', 'production', 'packing', 'dispatch', 'return', 'damage'];

const createZone = Joi.object({
  warehouseId: Joi.string().guid().required(),
  name: Joi.string().max(255).required(),
  zoneType: Joi.string().valid(...ZONE_TYPES),
});

const updateZone = Joi.object({
  name: Joi.string().max(255),
  zoneType: Joi.string().valid(...ZONE_TYPES),
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createZone, updateZone };
