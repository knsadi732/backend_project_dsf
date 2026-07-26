const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const AppError = require('../utils/AppError');
const grnService = require('../services/grn.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await grnService.listGrns(req.tenant.companyId, req.pagination, {
    vendorId: req.query.vendorId,
    warehouseId: req.query.warehouseId,
  });
  return sendSuccess(res, { message: 'GRN list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const grn = await grnService.getGrn(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'GRN detail.', data: grn });
});

const uploadInvoice = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('VALIDATION_001', [{ field: 'file', message: '"file" is required' }]);
  const grn = await grnService.uploadInvoice(req.tenant.companyId, req.body.grnNumber, req.file, req.user.id);
  return sendSuccess(res, { message: 'Vendor invoice uploaded and linked to GRN.', data: grn, statusCode: 201 });
});

module.exports = { list, getOne, uploadInvoice };
