const Joi = require('joi');

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

const registerAsset = Joi.object({
  itemId: Joi.string().guid().required(),
  vendorId: Joi.string().guid().allow(null),
  assetName: Joi.string().max(255).required(),
  serialNumber: Joi.string().max(100).allow(null, ''),
  purchaseDate: Joi.date().iso().required(),
  purchaseCost: Joi.number().positive().required(),
  warrantyExpiry: Joi.date().iso().allow(null),
  branchId: Joi.string().guid().allow(null),
  warehouseId: Joi.string().guid().allow(null),
  custodianUserId: Joi.string().guid().allow(null),
  custodianName: Joi.string().max(255).allow(null, ''),
  locationNote: Joi.string().max(255).allow(null, ''),
  depreciationMethod: Joi.string().valid('straight_line', 'written_down_value'),
  usefulLifeYears: Joi.number().min(0),
  salvageValue: Joi.number().min(0),
  remarks: Joi.string().allow(null, ''),
  transactionDate: Joi.date().iso(),
  partyName: Joi.string().max(255).allow(null, ''),
  utrReference: Joi.string().max(100).allow(null, ''),
  paymentMode: Joi.string().valid('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'credit_card').allow(null, ''),
  fundingSourceId: Joi.string().guid().allow(null),
  fundingType: Joi.string().valid('advance', 'loan', 'equity', 'other').allow(null, ''),
  gstApplicable: Joi.boolean(),
  gstAmount: Joi.number().min(0),
  gstDetail,
  existingFinanceTransactionId: Joi.string().guid().allow(null),
});

const reassignAsset = Joi.object({
  branchId: Joi.string().guid().allow(null),
  warehouseId: Joi.string().guid().allow(null),
  custodianUserId: Joi.string().guid().allow(null),
  custodianName: Joi.string().max(255).allow(null, ''),
  locationNote: Joi.string().max(255).allow(null, ''),
  remarks: Joi.string().allow(null, ''),
});

const recordMaintenance = Joi.object({
  maintenanceType: Joi.string().valid('scheduled', 'breakdown'),
  maintenanceDate: Joi.date().iso().required(),
  vendorName: Joi.string().max(255).allow(null, ''),
  cost: Joi.number().min(0),
  downtimeHours: Joi.number().min(0).allow(null),
  nextScheduledDate: Joi.date().iso().allow(null),
  setUnderMaintenance: Joi.boolean().default(false),
  paymentMode: Joi.string().valid('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'credit_card').allow(null, ''),
  remarks: Joi.string().allow(null, ''),
});

const disposeAsset = Joi.object({
  disposalType: Joi.string().valid('sale', 'write_off', 'scrap').required(),
  disposalDate: Joi.date().iso().required(),
  disposalValue: Joi.number().min(0).allow(null),
  remarks: Joi.string().allow(null, ''),
});

module.exports = { registerAsset, reassignAsset, recordMaintenance, disposeAsset };
