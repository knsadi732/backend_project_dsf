const { query } = require('../config/db');

async function create(
  companyId,
  { name, defaultCommissionPercent, defaultCostPerUnit, assumedCustomerReturnPercent, assumedRtoPercent, marginMin, marginMax, remarks },
  createdBy,
) {
  const { rows } = await query(
    `INSERT INTO marketplace_channels (
       company_id, name, default_commission_percent, default_cost_per_unit,
       assumed_customer_return_percent, assumed_rto_percent, margin_min, margin_max, remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [
      companyId,
      name,
      defaultCommissionPercent || 0,
      defaultCostPerUnit || 0,
      assumedCustomerReturnPercent || 0,
      assumedRtoPercent || 0,
      marginMin || 0,
      marginMax || 0,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT * FROM marketplace_channels WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, { activeOnly } = {}) {
  const conditions = ['company_id = $1', 'is_deleted = FALSE'];
  if (activeOnly) conditions.push('is_active = TRUE');
  const { rows } = await query(
    `SELECT * FROM marketplace_channels WHERE ${conditions.join(' AND ')} ORDER BY name ASC`,
    [companyId],
  );
  return rows;
}

async function update(companyId, id, { defaultCommissionPercent, defaultCostPerUnit, assumedCustomerReturnPercent, assumedRtoPercent, marginMin, marginMax, isActive, remarks }, updatedBy) {
  const { rows } = await query(
    `UPDATE marketplace_channels
     SET default_commission_percent = COALESCE($3, default_commission_percent),
         default_cost_per_unit = COALESCE($4, default_cost_per_unit),
         assumed_customer_return_percent = COALESCE($5, assumed_customer_return_percent),
         assumed_rto_percent = COALESCE($6, assumed_rto_percent),
         margin_min = COALESCE($7, margin_min),
         margin_max = COALESCE($8, margin_max),
         is_active = COALESCE($9, is_active),
         remarks = COALESCE($10, remarks),
         updated_by = $11, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, defaultCommissionPercent, defaultCostPerUnit, assumedCustomerReturnPercent, assumedRtoPercent, marginMin, marginMax, isActive, remarks, updatedBy],
  );
  return rows[0] || null;
}

module.exports = { create, findById, list, update };
