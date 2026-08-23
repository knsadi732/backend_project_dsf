const { query } = require('../config/db');

async function create(client, { assetId, branchId, warehouseId, custodianUserId, locationNote, remarks }, assignedBy) {
  const { rows } = await client.query(
    `INSERT INTO fixed_asset_assignments (asset_id, branch_id, warehouse_id, custodian_user_id, location_note, assigned_by, remarks)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [assetId, branchId || null, warehouseId || null, custodianUserId || null, locationNote || null, assignedBy, remarks || null],
  );
  return rows[0];
}

async function listByAsset(assetId) {
  const { rows } = await query(
    `SELECT faa.*, u.full_name AS custodian_name
     FROM fixed_asset_assignments faa
     LEFT JOIN users u ON u.id = faa.custodian_user_id
     WHERE faa.asset_id = $1 AND faa.is_deleted = FALSE
     ORDER BY faa.assigned_at DESC`,
    [assetId],
  );
  return rows;
}

module.exports = { create, listByAsset };
