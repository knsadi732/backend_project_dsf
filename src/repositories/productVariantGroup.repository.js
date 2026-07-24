const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination, { productId } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (productId) {
    extraConditions.push(`product_id = $${extraParams.length + 2}`);
    extraParams.push(productId);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'product_variant_groups',
    companyId,
    pagination,
    searchableColumns: ['group_sku', 'variant_name', 'color'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT * FROM product_variant_groups WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function create(companyId, { productId, groupSku, variantName, color }, createdBy) {
  const { rows } = await query(
    `INSERT INTO product_variant_groups (company_id, product_id, group_sku, variant_name, color, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING *`,
    [companyId, productId, groupSku, variantName, color || null, createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { variantName, color, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE product_variant_groups
     SET variant_name = COALESCE($3, variant_name), color = COALESCE($4, color),
         status = COALESCE($5, status), updated_by = $6, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, variantName, color, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE product_variant_groups SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
