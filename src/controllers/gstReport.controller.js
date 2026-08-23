const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const gstReportService = require('../services/gstReport.service');

const periodFromQuery = (req) => ({ from: req.query.from, to: req.query.to });

const getGstr1 = asyncHandler(async (req, res) => {
  const summary = await gstReportService.getGstr1Summary(req.tenant.companyId, periodFromQuery(req));
  return sendSuccess(res, { message: 'GSTR-1 summary.', data: summary });
});

const getGstr3b = asyncHandler(async (req, res) => {
  const summary = await gstReportService.getGstr3bSummary(req.tenant.companyId, periodFromQuery(req));
  return sendSuccess(res, { message: 'GSTR-3B summary.', data: summary });
});

const getGstr2bProxy = asyncHandler(async (req, res) => {
  const summary = await gstReportService.getGstr2bProxy(req.tenant.companyId, periodFromQuery(req));
  return sendSuccess(res, { message: 'GSTR-2B proxy (not GSTN-reconciled).', data: summary });
});

const getProfitAndLoss = asyncHandler(async (req, res) => {
  const summary = await gstReportService.getProfitAndLoss(req.tenant.companyId, periodFromQuery(req));
  return sendSuccess(res, { message: 'Profit & Loss summary.', data: summary });
});

module.exports = { getGstr1, getGstr3b, getGstr2bProxy, getProfitAndLoss };
