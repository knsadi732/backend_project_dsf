const Joi = require('joi');

const login = Joi.object({
  identifier: Joi.string().required(), // email or phone number
  password: Joi.string().min(6).required(),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  locationLabel: Joi.string().max(255).allow(null, ''),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required(),
});

const logout = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { login, refresh, logout };
