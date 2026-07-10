const Joi = require('joi');

const uploadDocument = Joi.object({
  branchId: Joi.string().guid().allow(null, ''),
  warehouseId: Joi.string().guid().allow(null, ''),
  entityType: Joi.string()
    .valid('product', 'vendor', 'employee', 'invoice', 'gst_certificate')
    .required(),
  entityId: Joi.string().guid().allow(null, ''),
  isPublic: Joi.boolean().default(false),
});

module.exports = { uploadDocument };
