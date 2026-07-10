const { query } = require('../config/db');

async function upsert(companyId, widgetKey, periodStart, periodEnd, data) {
  const { rows } = await query(
    `INSERT INTO analytics_snapshots (company_id, widget_key, period_start, period_end, data, generated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (company_id, widget_key, period_start, period_end)
     DO UPDATE SET data = $5, generated_at = now()
     RETURNING *`,
    [companyId, widgetKey, periodStart, periodEnd, JSON.stringify(data)],
  );
  return rows[0];
}

async function findLatest(companyId, widgetKey) {
  const { rows } = await query(
    `SELECT * FROM analytics_snapshots WHERE company_id = $1 AND widget_key = $2 ORDER BY period_end DESC LIMIT 1`,
    [companyId, widgetKey],
  );
  return rows[0] || null;
}

async function listActiveCompanyIds() {
  const { rows } = await query(`SELECT id FROM companies WHERE is_deleted = FALSE AND status = 'active'`);
  return rows.map((r) => r.id);
}

module.exports = { upsert, findLatest, listActiveCompanyIds };
