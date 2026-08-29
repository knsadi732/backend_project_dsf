const { query } = require('../config/db');

const SELECT_WITH_JOINS = `
  SELECT bom.*, iv.sku, iv.size, iv.color, i.item_name AS raw_material_name, i.uom AS raw_material_uom, p.name AS product_name
  FROM bill_of_materials bom
  JOIN item_variants iv ON iv.id = bom.raw_material_variant_id
  JOIN items i ON i.id = iv.item_id
  JOIN products p ON p.id = bom.product_id
`;

async function create(companyId, { productId, rawMaterialVariantId, quantityPerUnit, remarks }, createdBy) {
  const { rows } = await query(
    `INSERT INTO bill_of_materials (company_id, product_id, raw_material_variant_id, quantity_per_unit, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING *`,
    [companyId, productId, rawMaterialVariantId, quantityPerUnit, remarks || null, createdBy],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE bom.id = $1 AND bom.company_id = $2 AND bom.is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function list(companyId, pagination, { productId } = {}) {
  const { limit, offset } = pagination;
  const conditions = ['bom.company_id = $1', 'bom.is_deleted = FALSE'];
  const params = [companyId];
  if (productId) {
    params.push(productId);
    conditions.push(`bom.product_id = $${params.length}`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `${SELECT_WITH_JOINS} ${whereClause} ORDER BY bom.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) FROM bill_of_materials bom ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, [...params, limit, offset]), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

/** Every BOM line for a product, unpaginated — used at work-order creation time to compute raw material needs. */
async function listByProduct(companyId, productId) {
  const { rows } = await query(
    `${SELECT_WITH_JOINS} WHERE bom.company_id = $1 AND bom.product_id = $2 AND bom.is_deleted = FALSE`,
    [companyId, productId],
  );
  return rows;
}

async function update(companyId, id, { quantityPerUnit, remarks }, updatedBy) {
  const { rows } = await query(
    `UPDATE bill_of_materials
     SET quantity_per_unit = COALESCE($3, quantity_per_unit), remarks = COALESCE($4, remarks),
         updated_by = $5, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, quantityPerUnit, remarks, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE bill_of_materials SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { create, findById, list, listByProduct, update, softDelete };
