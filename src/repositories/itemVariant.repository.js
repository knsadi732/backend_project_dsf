const { query } = require('../config/db');

/** Reserves and returns the next variant SKU, e.g. 'ITV-000001'. Each call consumes the sequence. */
async function generateSku(runner = query) {
  const { rows } = await runner(`SELECT 'ITV-' || LPAD(nextval('item_variants_sku_seq')::text, 6, '0') AS sku`);
  return rows[0].sku;
}

/** Previews the next variant SKU without consuming the sequence — safe to call repeatedly. */
async function peekSku(runner = query) {
  const { rows } = await runner(
    `SELECT 'ITV-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 6, '0') AS sku
     FROM item_variants_sku_seq`,
  );
  return rows[0].sku;
}

const SELECT_WITH_JOINS = `
  SELECT iv.*, i.item_name, i.item_code, i.uom, i.hsn_code, i.gst_percentage, i.standard_cost AS item_standard_cost,
         i.item_category_id, ic.category_name AS item_category_name, ic.stock_kind
  FROM item_variants iv
  JOIN items i ON i.id = iv.item_id
  LEFT JOIN item_categories ic ON ic.id = i.item_category_id
`;

async function create(companyId, { itemId, sku, size, color, standardCost, remarks }, createdBy, client) {
  const runner = client ?? { query };
  const code = sku || (await generateSku((text, params) => runner.query(text, params)));
  const { rows } = await runner.query(
    `INSERT INTO item_variants (company_id, item_id, sku, size, color, standard_cost, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING *`,
    [companyId, itemId, code, size || null, color || null, standardCost ?? null, remarks || null, createdBy],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(
    `${SELECT_WITH_JOINS} WHERE iv.id = $1 AND iv.company_id = $2 AND iv.is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { itemId } = {}) {
  const conditions = ['iv.company_id = $1', 'iv.is_deleted = FALSE'];
  const params = [companyId];

  if (itemId) {
    params.push(itemId);
    conditions.push(`iv.item_id = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`(iv.sku ILIKE $${params.length} OR i.item_name ILIKE $${params.length})`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = typeof pagination.sortBy === 'string' && /^[a-zA-Z_]+$/.test(pagination.sortBy) ? pagination.sortBy : 'created_at';
  const safeSortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `${SELECT_WITH_JOINS} ${whereClause} ORDER BY iv.${safeSortBy} ${safeSortOrder} LIMIT $${
    params.length + 1
  } OFFSET $${params.length + 2}`;
  const dataParams = [...params, pagination.limit, pagination.offset];
  const countSql = `SELECT COUNT(*) FROM item_variants iv JOIN items i ON i.id = iv.item_id ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function update(companyId, id, { size, color, standardCost, remarks, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE item_variants
     SET size = COALESCE($3, size), color = COALESCE($4, color), standard_cost = COALESCE($5, standard_cost),
         remarks = COALESCE($6, remarks), status = COALESCE($7, status), updated_by = $8, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, size, color, standardCost, remarks, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE item_variants SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { generateSku, peekSku, create, findById, list, update, softDelete };
