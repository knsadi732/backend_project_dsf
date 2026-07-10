const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function create(companyId, { userId, channel, templateKey, recipient, payload }, createdBy) {
  const { rows } = await query(
    `INSERT INTO notifications (company_id, user_id, channel, template_key, recipient, payload, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [companyId, userId || null, channel, templateKey, recipient, JSON.stringify(payload || {}), createdBy],
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM notifications WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function markSent(id) {
  await query(`UPDATE notifications SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1`, [id]);
}

async function markFailed(id, errorMessage) {
  await query(
    `UPDATE notifications SET status = 'failed', attempts = attempts + 1, last_error = $2, updated_at = now() WHERE id = $1`,
    [id, errorMessage],
  );
}

/** Sweeps notifications that failed but haven't exhausted their retry budget. */
async function findFailedForRetry(maxAttempts, limit = 100) {
  const { rows } = await query(
    `SELECT id FROM notifications WHERE status = 'failed' AND attempts < $1 ORDER BY updated_at ASC LIMIT $2`,
    [maxAttempts, limit],
  );
  return rows;
}

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'notifications',
    companyId,
    pagination,
    searchableColumns: ['recipient', 'template_key'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, findById, markSent, markFailed, findFailedForRetry, list };
