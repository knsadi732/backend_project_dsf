const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const vendorBillService = require('../services/vendorBill.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await vendorBillService.listVendorBills(req.tenant.companyId, req.pagination, {
    status: req.query.status,
    vendorId: req.query.vendorId,
  });
  return sendSuccess(res, { message: 'Vendor bills list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const bill = await vendorBillService.getVendorBill(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Vendor bill detail.', data: bill });
});

const recordPayment = asyncHandler(async (req, res) => {
  const bill = await vendorBillService.recordPayment(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Vendor payment recorded.', data: bill });
});

module.exports = { list, getOne, recordPayment };
