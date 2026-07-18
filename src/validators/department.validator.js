const Joi = require('joi');

const createDepartment = Joi.object({
  name: Joi.string().max(150).required(),
});

const updateDepartment = createDepartment.fork(['name'], (s) => s.optional()).keys({
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = { createDepartment, updateDepartment };
