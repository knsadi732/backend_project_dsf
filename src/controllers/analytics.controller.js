const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const analyticsService = require('../services/analytics.service');

const getDashboard = asyncHandler(async (req, res) => {
  const widgets = await analyticsService.getDashboard(req.tenant.companyId);
  return sendSuccess(res, { message: 'Dashboard widgets.', data: widgets });
});

const getWidget = asyncHandler(async (req, res) => {
  const widget = await analyticsService.getWidget(req.tenant.companyId, req.params.key);
  return sendSuccess(res, { message: 'Dashboard widget.', data: widget });
});

const regenerate = asyncHandler(async (req, res) => {
  const result = await analyticsService.regenerateNow();
  return sendSuccess(res, { message: 'Analytics snapshots regenerated.', data: result });
});

module.exports = { getDashboard, getWidget, regenerate };
