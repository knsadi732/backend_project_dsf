const Joi = require('joi');

const STAGES = ['pending', 'in_progress', 'completed', 'cancelled'];

const createWorkOrder = Joi.object({
  productId: Joi.string().guid().required(),
  productVariantId: Joi.string().guid().allow(null),
  warehouseId: Joi.string().guid().allow(null),
  salesOrderId: Joi.string().guid().allow(null),
  workOrderNumber: Joi.string().max(50).allow(null, ''),
  quantity: Joi.number().positive().required(),
  stage: Joi.string().valid(...STAGES),
  dueDate: Joi.date().iso().allow(null, ''),
  rawMaterialCost: Joi.number().min(0),
  labourCost: Joi.number().min(0),
  machineCost: Joi.number().min(0),
  electricityCost: Joi.number().min(0),
  packagingCost: Joi.number().min(0),
  overheadCost: Joi.number().min(0),
  remarks: Joi.string().allow(null, ''),
});

const updateWorkOrder = Joi.object({
  quantity: Joi.number().positive(),
  stage: Joi.string().valid(...STAGES),
  dueDate: Joi.date().iso().allow(null, ''),
  rawMaterialCost: Joi.number().min(0),
  labourCost: Joi.number().min(0),
  machineCost: Joi.number().min(0),
  electricityCost: Joi.number().min(0),
  packagingCost: Joi.number().min(0),
  overheadCost: Joi.number().min(0),
  remarks: Joi.string().allow(null, ''),
});

module.exports = { createWorkOrder, updateWorkOrder };
