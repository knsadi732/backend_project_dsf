const Joi = require('joi');

const createShelf = Joi.object({
  rackId: Joi.string().guid().required(),
  code: Joi.string().max(100).required(),
  capacity: Joi.number().min(0),
});

const updateShelf = Joi.object({
  code: Joi.string().max(100),
  capacity: Joi.number().min(0),
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createShelf, updateShelf };
