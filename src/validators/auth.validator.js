const Joi = require('joi');

const login = Joi.object({
  identifier: Joi.string().required(), // email or phone number
  password: Joi.string().min(6).required(),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required(),
});

const logout = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { login, refresh, logout };
