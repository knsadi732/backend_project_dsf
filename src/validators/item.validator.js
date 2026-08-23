const Joi = require('joi');

const STOCK_KINDS = ['raw_material', 'packaging_material', 'consumable', 'spare_part', 'fixed_asset', 'tool', 'service'];

const createItemCategory = Joi.object({
  parentCategoryId: Joi.string().guid().allow(null),
  categoryName: Joi.string().max(255).required(),
  categoryCode: Joi.string().max(50).allow(null, ''),
  stockKind: Joi.string().valid(...STOCK_KINDS),
});

const updateItemCategory = Joi.object({
  categoryName: Joi.string().max(255),
  categoryCode: Joi.string().max(50).allow(null, ''),
  stockKind: Joi.string().valid(...STOCK_KINDS),
  status: Joi.string().valid('active', 'inactive'),
});

const createItem = Joi.object({
  itemCategoryId: Joi.string().guid().required(),
  preferredVendorId: Joi.string().guid().allow(null),
  itemCode: Joi.string().max(50).allow(null, ''),
  itemName: Joi.string().max(255).required(),
  description: Joi.string().allow(null, ''),
  uom: Joi.string().max(30),
  hsnCode: Joi.string().max(20).allow(null, ''),
  gstPercentage: Joi.number().min(0).max(100),
  standardCost: Joi.number().min(0),
  reorderLevel: Joi.number().min(0),
  specification: Joi.object().unknown(true),
});

const updateItem = Joi.object({
  itemCategoryId: Joi.string().guid(),
  preferredVendorId: Joi.string().guid().allow(null),
  itemName: Joi.string().max(255),
  description: Joi.string().allow(null, ''),
  uom: Joi.string().max(30),
  hsnCode: Joi.string().max(20).allow(null, ''),
  gstPercentage: Joi.number().min(0).max(100),
  standardCost: Joi.number().min(0),
  reorderLevel: Joi.number().min(0),
  specification: Joi.object().unknown(true),
  status: Joi.string().valid('active', 'inactive', 'discontinued'),
});

const gstDetail = Joi.object({
  taxableValue: Joi.number().min(0),
  gstRate: Joi.number().min(0).max(100),
  cgstAmount: Joi.number().min(0),
  sgstAmount: Joi.number().min(0),
  igstAmount: Joi.number().min(0),
  hsnCode: Joi.string().max(20).allow(null, ''),
  placeOfSupplyStateCode: Joi.string().max(2).allow(null, ''),
  partyGstin: Joi.string().max(20).allow(null, ''),
  partyType: Joi.string().valid('b2b', 'b2c'),
});

const receiveStock = Joi.object({
  warehouseId: Joi.string().guid().required(),
  itemId: Joi.string().guid().required(),
  quantity: Joi.number().positive().required(),
  unitCost: Joi.number().min(0),
  description: Joi.string().allow(null, ''),
  transactionDate: Joi.date().iso(),
  partyName: Joi.string().max(255).allow(null, ''),
  utrReference: Joi.string().max(100).allow(null, ''),
  paymentMode: Joi.string().valid('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'credit_card').allow(null, ''),
  fundingSourceId: Joi.string().guid().allow(null),
  fundingType: Joi.string().valid('advance', 'loan', 'equity', 'other').allow(null, ''),
  gstApplicable: Joi.boolean(),
  gstAmount: Joi.number().min(0),
  gstDetail,
  remarks: Joi.string().allow(null, ''),
});

const consumeStock = Joi.object({
  warehouseId: Joi.string().guid().required(),
  itemId: Joi.string().guid().required(),
  quantity: Joi.number().positive().required(),
  remarks: Joi.string().allow(null, ''),
});

module.exports = {
  createItemCategory,
  updateItemCategory,
  createItem,
  updateItem,
  receiveStock,
  consumeStock,
};
