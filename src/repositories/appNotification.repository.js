const { query } = require('../config/db');

async function create(companyId, { userId, title, message, type, category, entityId }, createdBy) {
  const { rows } = await query(
    `INSERT INTO app_notifications (company_id, user_id, title, message, type, category, entity_id, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING *`,
    [companyId, userId || null, title, message || null, type || 'information', category || null, entityId || null, createdBy],
  );
  return rows[0];
}

// A user's feed is their own targeted rows plus every company-wide
// broadcast (user_id IS NULL) — never another user's targeted rows.
async function list(companyId, userId, pagination, { status } = {}) {
  const conditions = ['company_id = $1', 'is_deleted = FALSE', '(user_id = $2 OR user_id IS NULL)'];
  const params = [companyId, userId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countSql = `SELECT COUNT(*) FROM app_notifications ${whereClause}`;
  params.push(pagination.limit, pagination.offset);
  const dataSql = `
    SELECT * FROM app_notifications
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const [data, count] = await Promise.all([query(dataSql, params), query(countSql, params.slice(0, -2))]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, userId, id) {
  const { rows } = await query(
    `SELECT * FROM app_notifications
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE AND (user_id = $3 OR user_id IS NULL)`,
    [id, companyId, userId],
  );
  return rows[0] || null;
}

async function setStatus(companyId, userId, id, status) {
  const { rows } = await query(
    `UPDATE app_notifications SET status = $4, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND (user_id = $3 OR user_id IS NULL) AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, userId, status],
  );
  return rows[0] || null;
}

// Broadcast rows (user_id IS NULL) have one shared status, not a per-viewer
// read state — marking one read/archived affects every viewer, same as a
// shared company announcement board. Fine for this scale; a true per-user
// read receipt would need a separate junction table.
async function markAllRead(companyId, userId) {
  await query(
    `UPDATE app_notifications SET status = 'read', updated_at = now()
     WHERE company_id = $1 AND (user_id = $2 OR user_id IS NULL) AND status = 'unread' AND is_deleted = FALSE`,
    [companyId, userId],
  );
}

module.exports = { create, list, findById, setStatus, markAllRead };
