const Joi = require('joi');

const STATUSES = ['running', 'down', 'maintenance'];

const createMachine = Joi.object({
  warehouseId: Joi.string().guid().allow(null),
  name: Joi.string().max(150).required(),
  machineType: Joi.string().max(50).allow(null, ''),
  status: Joi.string().valid(...STATUSES),
  remarks: Joi.string().allow(null, ''),
});

const updateMachine = Joi.object({
  warehouseId: Joi.string().guid().allow(null),
  name: Joi.string().max(150),
  machineType: Joi.string().max(50).allow(null, ''),
  remarks: Joi.string().allow(null, ''),
});

// Downtime is never set directly on the machine — it's opened/closed via
// its own event so a history survives (reportDown/resolveDowntime below).
const reportDown = Joi.object({
  reason: Joi.string().allow(null, ''),
});

module.exports = { createMachine, updateMachine, reportDown, STATUSES };
