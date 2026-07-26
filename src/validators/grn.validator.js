const Joi = require('joi');

const uploadInvoice = Joi.object({
  grnNumber: Joi.string().max(50).required(),
});

module.exports = { uploadInvoice };
