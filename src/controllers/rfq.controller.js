const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const rfqService = require('../services/rfq.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await rfqService.listRfqs(req.tenant.companyId, req.pagination, {
    status: req.query.status,
    purchaseRequestId: req.query.purchaseRequestId,
  });
  return sendSuccess(res, { message: 'RFQs list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const rfq = await rfqService.getRfq(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'RFQ detail.', data: rfq });
});

const create = asyncHandler(async (req, res) => {
  const rfq = await rfqService.createRfq(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'RFQ created.', data: rfq, statusCode: 201 });
});

const generateNumber = asyncHandler(async (req, res) => {
  const rfqNumber = await rfqService.generateRfqNumber();
  return sendSuccess(res, { message: 'RFQ number generated.', data: { rfqNumber } });
});

const send = asyncHandler(async (req, res) => {
  const rfq = await rfqService.sendRfq(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'RFQ sent to vendors.', data: rfq });
});

const selectVendor = asyncHandler(async (req, res) => {
  const rfq = await rfqService.selectVendor(req.tenant.companyId, req.params.id, req.body.vendorQuotationId, req.user.id);
  return sendSuccess(res, { message: 'Vendor selected.', data: rfq });
});

module.exports = { list, getOne, create, generateNumber, send, selectVendor };
