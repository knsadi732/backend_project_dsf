const { query } = require('../config/db');

/** Resolves parent_id to a display-friendly parent_name alongside it — kept as a raw
 * query rather than buildListQuery since the self-join makes bare column names ambiguous. */
const SELECT_WITH_PARENT_NAME = `
  SELECT c.*, parent.name AS parent_name
  FROM product_categories c
  LEFT JOIN product_categories parent ON parent.id = c.parent_id`;

async function list(companyId, pagination) {
  const conditions = ['c.company_id = $1', 'c.is_deleted = FALSE'];
  const params = [companyId];

  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`c.name ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = /^[a-zA-Z_]+$/.test(pagination.sortBy) ? pagination.sortBy : 'created_at';
  const safeSortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `${SELECT_WITH_PARENT_NAME} ${whereClause} ORDER BY c.${safeSortBy} ${safeSortOrder} LIMIT $${
    params.length + 1
  } OFFSET $${params.length + 2}`;
  const dataParams = [...params, pagination.limit, pagination.offset];
  const countSql = `SELECT COUNT(*) FROM product_categories c ${whereClause}`;

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

async function create(companyId, { parentId, name, categoryCode }, createdBy) {
  const { rows } = await query(
    `INSERT INTO product_categories (company_id, parent_id, name, category_code, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING *`,
    [companyId, parentId || null, name, categoryCode || null, createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { name, categoryCode, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE product_categories
     SET name = COALESCE($3, name), category_code = COALESCE($4, category_code),
         status = COALESCE($5, status), updated_by = $6, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, name, categoryCode, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE product_categories SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
