const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function create(
  companyId,
  { assetId, maintenanceType, maintenanceDate, vendorName, cost, downtimeHours, nextScheduledDate, financeTransactionId, remarks },
  createdBy,
) {
  const { rows } = await query(
    `INSERT INTO fixed_asset_maintenance_logs (
       asset_id, company_id, maintenance_type, maintenance_date, vendor_name, cost, downtime_hours,
       next_scheduled_date, finance_transaction_id, remarks, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      assetId,
      companyId,
      maintenanceType || 'scheduled',
      maintenanceDate,
      vendorName || null,
      cost || 0,
      downtimeHours || null,
      nextScheduledDate || null,
      financeTransactionId || null,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function list(companyId, pagination, { assetId } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (assetId) {
    extraConditions.push(`asset_id = $${extraParams.length + 2}`);
    extraParams.push(assetId);
  }
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'fixed_asset_maintenance_logs',
    companyId,
    pagination,
    searchableColumns: ['vendor_name', 'remarks'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, list };
