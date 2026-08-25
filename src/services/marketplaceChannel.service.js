const AppError = require('../utils/AppError');
const marketplaceChannelRepository = require('../repositories/marketplaceChannel.repository');

async function createChannel(companyId, payload, actorId) {
  return marketplaceChannelRepository.create(companyId, payload, actorId);
}

async function getChannel(companyId, id) {
  const channel = await marketplaceChannelRepository.findById(companyId, id);
  if (!channel) throw new AppError('CHANNEL_001');
  return channel;
}

async function listChannels(companyId, filters) {
  return marketplaceChannelRepository.list(companyId, filters);
}

async function updateChannel(companyId, id, payload, actorId) {
  const updated = await marketplaceChannelRepository.update(companyId, id, payload, actorId);
  if (!updated) throw new AppError('CHANNEL_001');
  return updated;
}

module.exports = { createChannel, getChannel, listChannels, updateChannel };
