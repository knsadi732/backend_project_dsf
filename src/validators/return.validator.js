const Joi = require('joi');

const REASONS = [
  'wrong_product',
  'wrong_size',
  'wrong_color',
  'manufacturing_defect',
  'damaged_in_transit',
  'packaging_damage',
  'quality_issue',
  'customer_changed_mind',
  'duplicate_order',
  'other',
];

const STATUSES = [
  'requested',
  'approved',
  'partially_approved',
  'rejected',
  'cancelled',
  'pickup_scheduled',
  'warehouse_received',
  'inspection_completed',
  'resolved',
];

const createReturn = Joi.object({
  branchId: Joi.string().guid().allow(null),
  returnNumber: Joi.string().max(50),
  orderId: Joi.string().guid().required(),
  productVariantId: Joi.string().guid().required(),
  warehouseId: Joi.string().guid().allow(null),
  quantity: Joi.number().positive().required(),
  type: Joi.string().valid('customer', 'courier').default('customer'),
  reason: Joi.string().valid(...REASONS).required(),
  amount: Joi.number().min(0).default(0),
  remarks: Joi.string().allow(null, ''),
});

const updateReturn = Joi.object({
  quantity: Joi.number().positive(),
  type: Joi.string().valid('customer', 'courier'),
  reason: Joi.string().valid(...REASONS),
  amount: Joi.number().min(0),
  status: Joi.string().valid(...STATUSES),
  warehouseId: Joi.string().guid().allow(null),
  courierPartner: Joi.string().max(100).allow(null, ''),
  pickupDate: Joi.date().iso().allow(null),
  trackingNumber: Joi.string().max(100).allow(null, ''),
  inspectionResult: Joi.string().valid('passed', 'failed', 'repairable', 'scrap').allow(null),
  inspectionNotes: Joi.string().allow(null, ''),
  decision: Joi.string().valid('restock', 'repair', 'scrap', 'reject').allow(null),
  resolutionType: Joi.string().valid('none', 'refund', 'replacement'),
  refundAmount: Joi.number().min(0),
  refundMethod: Joi.string().valid('upi', 'bank_transfer', 'credit_card', 'debit_card', 'wallet', 'original_method').allow(null, ''),
  refundReference: Joi.string().max(100).allow(null, ''),
  refundDate: Joi.date().iso().allow(null),
  replacementOrderId: Joi.string().guid().allow(null),
  remarks: Joi.string().allow(null, ''),
});

module.exports = { createReturn, updateReturn };
