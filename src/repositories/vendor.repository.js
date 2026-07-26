const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'vendors',
    companyId,
    pagination,
    searchableColumns: ['name', 'phone', 'email', 'gstin'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM vendors WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function create(companyId, fields, createdBy) {
  const { rows } = await query(
    `INSERT INTO vendors (
       company_id, name, phone, email, gstin, address, vendor_type, addresses,
       bank_account_number, bank_ifsc, bank_name, credit_days, credit_limit, quality_rating,
       payment_terms, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
     RETURNING *`,
    [
      companyId,
      fields.name,
      fields.phone,
      fields.email,
      fields.gstin,
      fields.address,
      fields.vendorType || null,
      JSON.stringify(fields.addresses || []),
      fields.bankAccountNumber || null,
      fields.bankIfsc || null,
      fields.bankName || null,
      fields.creditDays ?? 0,
      fields.creditLimit ?? 0,
      fields.qualityRating ?? null,
      fields.paymentTerms || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function update(companyId, id, fields, updatedBy) {
  const { rows } = await query(
    `UPDATE vendors
     SET name = COALESCE($3, name), phone = COALESCE($4, phone), email = COALESCE($5, email),
         gstin = COALESCE($6, gstin), address = COALESCE($7, address), status = COALESCE($8, status),
         vendor_type = COALESCE($9, vendor_type), addresses = COALESCE($10, addresses),
         bank_account_number = COALESCE($11, bank_account_number), bank_ifsc = COALESCE($12, bank_ifsc),
         bank_name = COALESCE($13, bank_name), credit_days = COALESCE($14, credit_days),
         credit_limit = COALESCE($15, credit_limit), quality_rating = COALESCE($16, quality_rating),
         payment_terms = COALESCE($17, payment_terms), updated_by = $18, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      companyId,
      fields.name,
      fields.phone,
      fields.email,
      fields.gstin,
      fields.address,
      fields.status,
      fields.vendorType,
      fields.addresses ? JSON.stringify(fields.addresses) : null,
      fields.bankAccountNumber,
      fields.bankIfsc,
      fields.bankName,
      fields.creditDays,
      fields.creditLimit,
      fields.qualityRating,
      fields.paymentTerms,
      updatedBy,
    ],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE vendors SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
