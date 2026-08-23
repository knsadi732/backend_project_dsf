const Joi = require('joi');

const STAGES = ['pending', 'in_progress', 'completed', 'cancelled'];
// Shop-floor position — separate from `stage` (which only tracks the coarse
// pending/in_progress/completed/cancelled lifecycle). Sequential, advanced
// one step at a time via PATCH /:id/floor-stage.
const FLOOR_STAGES = ['cutting', 'stitching', 'lasting', 'finishing'];

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
  // Units actually produced — set (or corrected) when the batch reaches
  // "completed"; may differ from the planned `quantity`. Feeds Material
  // Waste Variance and Daily Production Output.
  actualQuantity: Joi.number().min(0).allow(null),
});

const advanceFloorStage = Joi.object({
  floorStage: Joi.string()
    .valid(...FLOOR_STAGES)
    .required(),
});

module.exports = { createWorkOrder, updateWorkOrder, advanceFloorStage, FLOOR_STAGES };
