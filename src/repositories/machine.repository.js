const { query } = require('../config/db');

const SELECT_WITH_JOINS = `
  SELECT m.*, w.name AS warehouse_name
  FROM machines m
  LEFT JOIN warehouses w ON w.id = m.warehouse_id
`;

async function create(companyId, { warehouseId, name, machineType, status, remarks }, createdBy) {
  const { rows } = await query(
    `INSERT INTO machines (company_id, warehouse_id, name, machine_type, status, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'running'), $6, $7, $7)
     RETURNING *`,
    [companyId, warehouseId || null, name, machineType || null, status, remarks || null, createdBy],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE m.id = $1 AND m.company_id = $2 AND m.is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function list(companyId, pagination, { status, search } = {}) {
  const { limit, offset } = pagination;
  const conditions = ['m.company_id = $1', 'm.is_deleted = FALSE'];
  const params = [companyId];
  if (status) {
    params.push(status);
    conditions.push(`m.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`m.name ILIKE $${params.length}`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `${SELECT_WITH_JOINS} ${whereClause} ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) FROM machines m ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, [...params, limit, offset]), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function update(companyId, id, fields, updatedBy) {
  const { rows } = await query(
    `UPDATE machines
     SET warehouse_id = COALESCE($3, warehouse_id), name = COALESCE($4, name),
         machine_type = COALESCE($5, machine_type), remarks = COALESCE($6, remarks),
         updated_by = $7, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, fields.warehouseId, fields.name, fields.machineType, fields.remarks, updatedBy],
  );
  return rows[0] || null;
}

async function setStatus(client, companyId, id, status, updatedBy) {
  const { rows } = await client.query(
    `UPDATE machines SET status = $3, updated_by = $4, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE machines SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

async function createDowntimeEvent(client, companyId, machineId, reason, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO machine_downtime_events (company_id, machine_id, reason, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING *`,
    [companyId, machineId, reason || null, createdBy],
  );
  return rows[0];
}

async function findOpenDowntimeEvent(client, companyId, machineId) {
  const { rows } = await client.query(
    `SELECT * FROM machine_downtime_events
     WHERE company_id = $1 AND machine_id = $2 AND ended_at IS NULL AND is_deleted = FALSE
     LIMIT 1 FOR UPDATE`,
    [companyId, machineId],
  );
  return rows[0] || null;
}

async function closeDowntimeEvent(client, companyId, eventId, updatedBy) {
  const { rows } = await client.query(
    `UPDATE machine_downtime_events SET ended_at = now(), updated_by = $3, updated_at = now()
     WHERE id = $1 AND company_id = $2
     RETURNING *`,
    [eventId, companyId, updatedBy],
  );
  return rows[0] || null;
}

async function listDowntimeEvents(companyId, pagination, { machineId } = {}) {
  const { limit, offset } = pagination;
  const conditions = ['mde.company_id = $1', 'mde.is_deleted = FALSE'];
  const params = [companyId];
  if (machineId) {
    params.push(machineId);
    conditions.push(`mde.machine_id = $${params.length}`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `SELECT mde.*, m.name AS machine_name FROM machine_downtime_events mde
                    JOIN machines m ON m.id = mde.machine_id
                    ${whereClause} ORDER BY mde.started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) FROM machine_downtime_events mde ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, [...params, limit, offset]), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = {
  create,
  findById,
  list,
  update,
  setStatus,
  softDelete,
  createDowntimeEvent,
  findOpenDowntimeEvent,
  closeDowntimeEvent,
  listDowntimeEvents,
};
