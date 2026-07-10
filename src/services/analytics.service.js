const AppError = require('../utils/AppError');
const { CACHE_PREFIX, CACHE_TTL_SECONDS } = require('../config/redis');
const cache = require('../redis/cache');
const analyticsSnapshotRepository = require('../repositories/analyticsSnapshot.repository');
const runReportGeneration = require('../jobs/reportGeneration.job');

const WIDGET_KEYS = ['sales_summary', 'inventory_status'];

/** Dashboard Cache tier (plan.md Chapter 6) — 15-minute TTL over precomputed snapshots. */
async function getWidget(companyId, widgetKey) {
  if (!WIDGET_KEYS.includes(widgetKey)) throw new AppError('COMMON_001', [], `Unknown dashboard widget: ${widgetKey}`);

  const cacheKey = `${CACHE_PREFIX.DASHBOARD}${companyId}:${widgetKey}`;
  const cached = await cache.getJSON(cacheKey);
  if (cached) return cached;

  const snapshot = await analyticsSnapshotRepository.findLatest(companyId, widgetKey);
  if (!snapshot) return { widgetKey, data: null, generatedAt: null };

  const result = { widgetKey, data: snapshot.data, generatedAt: snapshot.generated_at };
  await cache.setJSON(cacheKey, result, CACHE_TTL_SECONDS.DASHBOARD);
  return result;
}

async function getDashboard(companyId) {
  const widgets = await Promise.all(WIDGET_KEYS.map((key) => getWidget(companyId, key)));
  return widgets;
}

/** On-demand regeneration — the scheduled job (Service-05) runs this automatically each night. */
async function regenerateNow() {
  return runReportGeneration();
}

module.exports = { getWidget, getDashboard, regenerateNow, WIDGET_KEYS };
