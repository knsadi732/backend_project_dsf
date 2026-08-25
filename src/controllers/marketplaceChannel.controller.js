const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const marketplaceChannelService = require('../services/marketplaceChannel.service');

const list = asyncHandler(async (req, res) => {
  const rows = await marketplaceChannelService.listChannels(req.tenant.companyId, { activeOnly: req.query.activeOnly === 'true' });
  return sendSuccess(res, { message: 'Marketplace channels list.', data: rows });
});

const getOne = asyncHandler(async (req, res) => {
  const channel = await marketplaceChannelService.getChannel(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Marketplace channel detail.', data: channel });
});

const create = asyncHandler(async (req, res) => {
  const channel = await marketplaceChannelService.createChannel(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Marketplace channel created.', data: channel, statusCode: 201 });
});

const update = asyncHandler(async (req, res) => {
  const channel = await marketplaceChannelService.updateChannel(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Marketplace channel updated.', data: channel });
});

module.exports = { list, getOne, create, update };
