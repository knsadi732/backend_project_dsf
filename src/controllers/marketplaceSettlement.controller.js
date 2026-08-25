const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const marketplaceSettlementService = require('../services/marketplaceSettlement.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await marketplaceSettlementService.listSettlements(req.tenant.companyId, req.pagination, {
    channelId: req.query.channelId,
  });
  return sendSuccess(res, { message: 'Marketplace settlements list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const settlement = await marketplaceSettlementService.getSettlement(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Marketplace settlement detail.', data: settlement });
});

const generateNumber = asyncHandler(async (req, res) => {
  const settlementNumber = await marketplaceSettlementService.generateSettlementNumber();
  return sendSuccess(res, { message: 'Settlement number generated.', data: { settlementNumber } });
});

const create = asyncHandler(async (req, res) => {
  const settlement = await marketplaceSettlementService.recordSettlement(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Marketplace settlement recorded.', data: settlement, statusCode: 201 });
});

const monthlyChannelCost = asyncHandler(async (req, res) => {
  const referenceDate = req.query.month ? new Date(req.query.month) : new Date();
  const rows = await marketplaceSettlementService.getMonthlyChannelCost(req.tenant.companyId, referenceDate);
  return sendSuccess(res, { message: 'Monthly channel cost.', data: rows });
});

const monthlyProductCost = asyncHandler(async (req, res) => {
  const referenceDate = req.query.month ? new Date(req.query.month) : new Date();
  const rows = await marketplaceSettlementService.getMonthlyProductCost(req.tenant.companyId, referenceDate);
  return sendSuccess(res, { message: 'Monthly product cost.', data: rows });
});

module.exports = { list, getOne, generateNumber, create, monthlyChannelCost, monthlyProductCost };
