const Joi = require('joi');

const createDesignation = Joi.object({
  name: Joi.string().max(150).required(),
});

const updateDesignation = createDesignation.fork(['name'], (s) => s.optional()).keys({
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createDesignation, updateDesignation };
