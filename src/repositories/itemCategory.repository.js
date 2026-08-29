const { query } = require('../config/db');

/** Self-join for a display-friendly parent name — kept as raw SQL (not buildListQuery)
 * since the join makes bare column names ambiguous, mirroring productCategory.repository.js. */
const SELECT_WITH_PARENT_NAME = `
  SELECT c.*, parent.category_name AS parent_category_name
  FROM item_categories c
  LEFT JOIN item_categories parent ON parent.id = c.parent_category_id`;

async function list(companyId, pagination) {
  const conditions = ['c.company_id = $1', 'c.is_deleted = FALSE'];
  const params = [companyId];

  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`c.category_name ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = /^[a-zA-Z_]+$/.test(pagination.sortBy) ? pagination.sortBy : 'created_at';
  const safeSortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `${SELECT_WITH_PARENT_NAME} ${whereClause} ORDER BY c.${safeSortBy} ${safeSortOrder} LIMIT $${
    params.length + 1
  } OFFSET $${params.length + 2}`;
  const dataParams = [...params, pagination.limit, pagination.offset];
  const countSql = `SELECT COUNT(*) FROM item_categories c ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(
    `${SELECT_WITH_PARENT_NAME} WHERE c.id = $1 AND c.company_id = $2 AND c.is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

/** Reserves and returns the next category code, e.g. 'CAT-00001'. Each call consumes the sequence. */
async function generateCategoryCode(runner = query) {
  const { rows } = await runner(`SELECT 'CAT-' || LPAD(nextval('item_categories_cat_seq')::text, 5, '0') AS category_code`);
  return rows[0].category_code;
}

/** Previews the next category code without consuming the sequence — safe to call repeatedly (e.g. on every modal open). */
async function peekCategoryCode(runner = query) {
  const { rows } = await runner(
    `SELECT 'CAT-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 5, '0') AS category_code
     FROM item_categories_cat_seq`,
  );
  return rows[0].category_code;
}

async function create(companyId, { parentCategoryId, categoryName, categoryCode, stockKind }, createdBy) {
  const code = categoryCode || (await generateCategoryCode());
  const { rows } = await query(
    `INSERT INTO item_categories (company_id, parent_category_id, category_name, category_code, stock_kind, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING *`,
    [companyId, parentCategoryId || null, categoryName, code, stockKind || 'raw_material', createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { categoryName, categoryCode, stockKind, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE item_categories
     SET category_name = COALESCE($3, category_name), category_code = COALESCE($4, category_code),
         stock_kind = COALESCE($5, stock_kind), status = COALESCE($6, status),
         updated_by = $7, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, categoryName, categoryCode, stockKind, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE item_categories SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete, generateCategoryCode, peekCategoryCode };
