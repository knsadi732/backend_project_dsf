const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

/**
 * Marks attendance for a user's first login of the day. Idempotent — a second
 * login the same day hits the unique (company_id, user_id, attendance_date)
 * index and is silently ignored, so repeat logins never overwrite the
 * original check-in location/device.
 */
async function markCheckIn(companyId, userId, { deviceSignature, userAgent, ipAddress, latitude, longitude, locationLabel }) {
  const { rows } = await query(
    `INSERT INTO attendances (company_id, user_id, attendance_date, device_signature, user_agent, ip_address, latitude, longitude, location_label, created_by, updated_by)
     VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $2, $2)
     ON CONFLICT (company_id, user_id, attendance_date) WHERE is_deleted = FALSE DO NOTHING
     RETURNING *`,
    [companyId, userId, deviceSignature || null, userAgent || null, ipAddress || null, latitude ?? null, longitude ?? null, locationLabel || null],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { userId, from, to } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (userId) {
    extraConditions.push(`user_id = $${extraParams.length + 2}`);
    extraParams.push(userId);
  }
  if (from) {
    extraConditions.push(`attendance_date >= $${extraParams.length + 2}`);
    extraParams.push(from);
  }
  if (to) {
    extraConditions.push(`attendance_date <= $${extraParams.length + 2}`);
    extraParams.push(to);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'attendances',
    companyId,
    pagination,
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM attendances WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

module.exports = { markCheckIn, list, findById };
