const Joi = require('joi');

const createUser = Joi.object({
  branchId: Joi.string().guid().allow(null),
  warehouseId: Joi.string().guid().allow(null),
  roleId: Joi.string().guid().required(),
  additionalRoleIds: Joi.array().items(Joi.string().guid()).default([]),
  employeeId: Joi.string().max(50).allow(null, ''),
  fullName: Joi.string().max(255).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20).allow(null, ''),
  password: Joi.string().min(6).required(),
  department: Joi.string().max(100).allow(null, ''),
  jobTitle: Joi.string().max(100).allow(null, ''),
});

const updateUser = Joi.object({
  fullName: Joi.string().max(255),
  roleId: Joi.string().guid(),
  additionalRoleIds: Joi.array().items(Joi.string().guid()),
  department: Joi.string().max(100).allow(null, ''),
  jobTitle: Joi.string().max(100).allow(null, ''),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'terminated'),
});

module.exports = { createUser, updateUser };
