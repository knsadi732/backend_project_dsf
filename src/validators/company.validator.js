const Joi = require('joi');

const updateCompany = Joi.object({
  name: Joi.string().max(255),
  legalName: Joi.string().max(255).allow(null, ''),
  gstin: Joi.string().max(20).allow(null, ''),
  baseCurrency: Joi.string().max(10),
  locale: Joi.string().max(10),
  theme: Joi.string().max(50),
});

const createBranch = Joi.object({
  name: Joi.string().max(255).required(),
  code: Joi.string().max(50).allow(null, ''),
  address: Joi.string().allow(null, ''),
});

const updateBranch = Joi.object({
  name: Joi.string().max(255),
  code: Joi.string().max(50).allow(null, ''),
  address: Joi.string().allow(null, ''),
  status: Joi.string().valid('active', 'inactive'),
});

const createWarehouse = Joi.object({
  branchId: Joi.string().guid().required(),
  name: Joi.string().max(255).required(),
  code: Joi.string().max(50).allow(null, ''),
  address: Joi.string().allow(null, ''),
});

const updateWarehouse = Joi.object({
  name: Joi.string().max(255),
  code: Joi.string().max(50).allow(null, ''),
  address: Joi.string().allow(null, ''),
  status: Joi.string().valid('active', 'inactive'),
});

const updateSettings = Joi.object({
  invoicePrefix: Joi.string().max(20),
  invoiceSequenceNext: Joi.number().integer().min(1),
  fiscalYearStartMonth: Joi.number().integer().min(1).max(12),
  gstSettings: Joi.object().unknown(true),
  notificationSettings: Joi.object().unknown(true),
  // Dashboard KPI: today's actual completed Work Order quantity vs this.
  dailyProductionTarget: Joi.number().integer().min(0).allow(null),
});

module.exports = { updateCompany, createBranch, updateBranch, createWarehouse, updateWarehouse, updateSettings };
