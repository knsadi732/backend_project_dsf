const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const forecastService = require('../services/forecast.service');

const getSalesForecast = asyncHandler(async (req, res) => {
  const monthsHistory = req.query.monthsHistory ? Number(req.query.monthsHistory) : undefined;
  const monthsAhead = req.query.monthsAhead ? Number(req.query.monthsAhead) : undefined;
  const data = await forecastService.getSalesForecast(req.tenant.companyId, { monthsHistory, monthsAhead });
  return sendSuccess(res, { message: 'Sales forecast.', data });
});

const getSizeForecast = asyncHandler(async (req, res) => {
  const data = await forecastService.getSizeForecast(req.tenant.companyId, req.query.productId);
  return sendSuccess(res, { message: 'Size-wise demand forecast.', data });
});

const getChannelForecast = asyncHandler(async (req, res) => {
  const data = await forecastService.getChannelForecast(req.tenant.companyId);
  return sendSuccess(res, { message: 'Channel-wise demand forecast.', data });
});

module.exports = { getSalesForecast, getSizeForecast, getChannelForecast };
