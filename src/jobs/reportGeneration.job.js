const { query } = require('../config/db');
const analyticsSnapshotRepository = require('../repositories/analyticsSnapshot.repository');
const logger = require('../utils/logger');

/**
 * Report Generation (plan.md Service-05 + Service-07): raw tables ->
 * aggregator -> pre-computed reporting context. Dashboard widgets read the
 * snapshot rows this writes, never live-aggregating on the hot path.
 */
async function runReportGeneration() {
  const companyIds = await analyticsSnapshotRepository.listActiveCompanyIds();
  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date();
  periodEnd.setHours(23, 59, 59, 999);

  for (const companyId of companyIds) {
    const [salesResult, inventoryResult] = await Promise.all([
      query(
        `SELECT COUNT(*) AS order_count, COALESCE(SUM(total_amount), 0) AS total_sales
         FROM orders WHERE company_id = $1 AND is_deleted = FALSE AND created_at BETWEEN $2 AND $3`,
        [companyId, periodStart, periodEnd],
      ),
      query(
        `SELECT COALESCE(SUM(quantity_on_hand), 0) AS total_on_hand, COALESCE(SUM(quantity_reserved), 0) AS total_reserved
         FROM warehouse_stock WHERE company_id = $1 AND is_deleted = FALSE`,
        [companyId],
      ),
    ]);

    await analyticsSnapshotRepository.upsert(companyId, 'sales_summary', periodStart, periodEnd, salesResult.rows[0]);
    await analyticsSnapshotRepository.upsert(companyId, 'inventory_status', periodStart, periodEnd, inventoryResult.rows[0]);
  }

  logger.info(`Report generation complete for ${companyIds.length} compan${companyIds.length === 1 ? 'y' : 'ies'}.`);
  return { companies: companyIds.length };
}

module.exports = runReportGeneration;
