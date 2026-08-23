const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

const SELECT_WITH_JOINS = `
  SELECT fa.*, i.item_name, i.item_code, v.name AS vendor_name,
         COALESCE(fa.custodian_name, u.full_name) AS custodian_name, b.name AS branch_name, w.name AS warehouse_name
  FROM fixed_assets fa
  LEFT JOIN items i ON i.id = fa.item_id
  LEFT JOIN vendors v ON v.id = fa.vendor_id
  LEFT JOIN users u ON u.id = fa.custodian_user_id
  LEFT JOIN branches b ON b.id = fa.branch_id
  LEFT JOIN warehouses w ON w.id = fa.warehouse_id
`;

async function generateAssetTag(runner = query) {
  const { rows } = await runner(`SELECT 'FA-' || LPAD(nextval('fixed_assets_asset_seq')::text, 5, '0') AS asset_tag`);
  return rows[0].asset_tag;
}

async function create(
  client,
  companyId,
  {
    itemId, vendorId, assetTag, assetName, serialNumber, purchaseDate, purchaseCost, warrantyExpiry,
    financeTransactionId, branchId, warehouseId, custodianUserId, custodianName, locationNote,
    depreciationMethod, usefulLifeYears, salvageValue, remarks,
  },
  createdBy,
) {
  const tag = assetTag || (await generateAssetTag((text, params) => client.query(text, params)));
  const { rows } = await client.query(
    `INSERT INTO fixed_assets (
       company_id, item_id, vendor_id, asset_tag, asset_name, serial_number, purchase_date, purchase_cost,
       warranty_expiry, finance_transaction_id, branch_id, warehouse_id, custodian_user_id, custodian_name,
       location_note, depreciation_method, useful_life_years, salvage_value, remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20)
     RETURNING *`,
    [
      companyId,
      itemId,
      vendorId || null,
      tag,
      assetName,
      serialNumber || null,
      purchaseDate,
      purchaseCost,
      warrantyExpiry || null,
      financeTransactionId || null,
      branchId || null,
      warehouseId || null,
      custodianUserId || null,
      custodianName || null,
      locationNote || null,
      depreciationMethod || 'straight_line',
      usefulLifeYears || 0,
      salvageValue || 0,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE fa.id = $1 AND fa.company_id = $2 AND fa.is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM fixed_assets WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { status, itemCategoryId } = {}) {
  const conditions = ['fa.company_id = $1', 'fa.is_deleted = FALSE'];
  const params = [companyId];
  if (status) {
    params.push(status);
    conditions.push(`fa.status = $${params.length}`);
  }
  if (itemCategoryId) {
    params.push(itemCategoryId);
    conditions.push(`i.item_category_id = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`(fa.asset_name ILIKE $${params.length} OR fa.asset_tag ILIKE $${params.length})`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `${SELECT_WITH_JOINS} ${whereClause} ORDER BY fa.created_at DESC LIMIT $${params.length + 1} OFFSET $${
    params.length + 2
  }`;
  const countSql = `SELECT COUNT(*) FROM fixed_assets fa LEFT JOIN items i ON i.id = fa.item_id ${whereClause}`;

  const [data, count] = await Promise.all([
    query(dataSql, [...params, pagination.limit, pagination.offset]),
    query(countSql, params),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function reassign(client, id, expectedVersion, { branchId, warehouseId, custodianUserId, custodianName, locationNote }, updatedBy) {
  const { rows } = await client.query(
    `UPDATE fixed_assets
     SET branch_id = $3, warehouse_id = $4, custodian_user_id = $5, custodian_name = $6, location_note = $7,
         version = version + 1, updated_by = $8, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, branchId || null, warehouseId || null, custodianUserId || null, custodianName || null, locationNote || null, updatedBy],
  );
  return rows[0] || null;
}

async function updateStatus(client, id, expectedVersion, status, updatedBy) {
  const { rows } = await client.query(
    `UPDATE fixed_assets SET status = $3, version = version + 1, updated_by = $4, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, status, updatedBy],
  );
  return rows[0] || null;
}

async function dispose(
  client,
  id,
  expectedVersion,
  { disposalType, disposalDate, disposalValue, disposalFinanceTransactionId },
  updatedBy,
) {
  const { rows } = await client.query(
    `UPDATE fixed_assets
     SET status = 'disposed', disposal_type = $3, disposal_date = $4, disposal_value = $5,
         disposal_finance_transaction_id = $6, version = version + 1, updated_by = $7, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, disposalType, disposalDate, disposalValue || null, disposalFinanceTransactionId || null, updatedBy],
  );
  return rows[0] || null;
}

module.exports = { generateAssetTag, create, findById, findByIdForUpdate, list, reassign, updateStatus, dispose };
