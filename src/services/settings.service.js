const { CACHE_PREFIX, CACHE_TTL_SECONDS } = require('../config/redis');
const cache = require('../redis/cache');
const settingsRepository = require('../repositories/settings.repository');

/** Settings Cache tier (plan.md Chapter 6) — invalidated on every write. */
async function getSettings(companyId) {
  const cacheKey = `${CACHE_PREFIX.SETTINGS}${companyId}`;
  const cached = await cache.getJSON(cacheKey);
  if (cached) return cached;

  const settings = (await settingsRepository.findByCompanyId(companyId)) || (await settingsRepository.upsert(companyId, {}, null));
  await cache.setJSON(cacheKey, settings, CACHE_TTL_SECONDS.SETTINGS);
  return settings;
}

async function updateSettings(companyId, fields, actorId) {
  const settings = await settingsRepository.upsert(companyId, fields, actorId);
  await cache.del(`${CACHE_PREFIX.SETTINGS}${companyId}`);
  return settings;
}

module.exports = { getSettings, updateSettings };
