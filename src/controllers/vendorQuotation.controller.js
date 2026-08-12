const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const vendorQuotationService = require('../services/vendorQuotation.service');

const create = asyncHandler(async (req, res) => {
  const quotation = await vendorQuotationService.recordVendorQuotation(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Vendor quotation recorded.', data: quotation, statusCode: 201 });
});

module.exports = { create };
