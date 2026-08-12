const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'customers',
    companyId,
    pagination,
    searchableColumns: ['name', 'phone', 'email', 'gstin'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM customers WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function create(companyId, fields, createdBy) {
  const { rows } = await query(
    `INSERT INTO customers (company_id, name, phone, email, gstin, billing_address, shipping_address, customer_type, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'retail'), $9, $9)
     RETURNING *`,
    [
      companyId,
      fields.name,
      fields.phone,
      fields.email,
      fields.gstin,
      fields.billingAddress,
      fields.shippingAddress,
      fields.customerType,
      createdBy,
    ],
  );
  return rows[0];
}

async function update(companyId, id, fields, updatedBy) {
  const { rows } = await query(
    `UPDATE customers
     SET name = COALESCE($3, name), phone = COALESCE($4, phone), email = COALESCE($5, email),
         gstin = COALESCE($6, gstin), billing_address = COALESCE($7, billing_address),
         shipping_address = COALESCE($8, shipping_address), status = COALESCE($9, status),
         customer_type = COALESCE($10, customer_type),
         updated_by = $11, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      companyId,
      fields.name,
      fields.phone,
      fields.email,
      fields.gstin,
      fields.billingAddress,
      fields.shippingAddress,
      fields.status,
      fields.customerType,
      updatedBy,
    ],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE customers SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
