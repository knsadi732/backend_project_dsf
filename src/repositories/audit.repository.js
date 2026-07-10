const { query } = require('../config/db');

async function record({ companyId, userId, action, httpMethod, route, requestPayload, statusCode, ipAddress, userAgent }) {
  await query(
    `INSERT INTO audit_logs (company_id, user_id, action, http_method, route, request_payload, status_code, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [companyId, userId, action, httpMethod, route, requestPayload ? JSON.stringify(requestPayload) : null, statusCode, ipAddress, userAgent],
  );
}

async function list(companyId, pagination) {
  const { limit, offset, sortOrder } = pagination;
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const [data, count] = await Promise.all([
    query(
      `SELECT * FROM audit_logs WHERE company_id = $1 ORDER BY created_at ${safeSortOrder} LIMIT $2 OFFSET $3`,
      [companyId, limit, offset],
    ),
    query(`SELECT COUNT(*) FROM audit_logs WHERE company_id = $1`, [companyId]),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { record, list };
