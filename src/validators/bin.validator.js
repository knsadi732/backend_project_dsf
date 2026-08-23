const Joi = require('joi');

const createBin = Joi.object({
  shelfId: Joi.string().guid().required(),
  code: Joi.string().max(100).required(),
  capacity: Joi.number().min(0),
  currentQuantity: Joi.number().min(0),
});

const updateBin = Joi.object({
  code: Joi.string().max(100),
  capacity: Joi.number().min(0),
  currentQuantity: Joi.number().min(0),
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createBin, updateBin };
