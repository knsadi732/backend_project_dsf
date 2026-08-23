const { query } = require('../config/db');

const SELECT_WITH_JOINS = `
  SELECT ar.*, ru.full_name AS requested_by_name, au.full_name AS approved_by_name
  FROM approval_requests ar
  LEFT JOIN users ru ON ru.id = ar.requested_by
  LEFT JOIN users au ON au.id = ar.approved_by
`;

async function create(companyId, { requestType, referenceType, referenceId, payload, remarks }, createdBy) {
  const { rows } = await query(
    `INSERT INTO approval_requests (company_id, request_type, reference_type, reference_id, payload, requested_by, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $6, $6)
     RETURNING *`,
    [companyId, requestType, referenceType, referenceId, JSON.stringify(payload ?? {}), createdBy, remarks || null],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE ar.id = $1 AND ar.company_id = $2 AND ar.is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM approval_requests WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { status, requestType } = {}) {
  const { limit, offset } = pagination;
  const conditions = ['ar.company_id = $1', 'ar.is_deleted = FALSE'];
  const params = [companyId];
  if (status) {
    params.push(status);
    conditions.push(`ar.status = $${params.length}`);
  }
  if (requestType) {
    params.push(requestType);
    conditions.push(`ar.request_type = $${params.length}`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `${SELECT_WITH_JOINS} ${whereClause} ORDER BY ar.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) FROM approval_requests ar ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, [...params, limit, offset]), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function updateStatus(client, id, expectedVersion, { status, approvedBy }, updatedBy) {
  const { rows } = await client.query(
    `UPDATE approval_requests
     SET status = $3, approved_by = COALESCE($4, approved_by),
         approved_at = CASE WHEN $3 = 'approved' THEN now() ELSE approved_at END,
         version = version + 1, updated_by = $5, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, status, approvedBy || null, updatedBy],
  );
  return rows[0] || null;
}

module.exports = { create, findById, findByIdForUpdate, list, updateStatus };
