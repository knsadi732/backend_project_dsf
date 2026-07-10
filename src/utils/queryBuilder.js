/**
 * Shared builder for the standard tenant-scoped list query (plan.md Chapter 1 —
 * Pagination Standard). `table`/`columns` are always caller-supplied literals,
 * never request input, so string interpolation there is safe; search/sort
 * values are parameterized or whitelisted.
 */
function buildListQuery({
  table,
  columns = '*',
  companyId,
  pagination,
  searchableColumns = [],
  extraConditions = [],
  extraParams = [],
}) {
  const { limit, offset, search, sortBy, sortOrder } = pagination;
  const conditions = ['company_id = $1', 'is_deleted = FALSE', ...extraConditions];
  const params = [companyId, ...extraParams];

  if (search && searchableColumns.length) {
    const searchParamIndex = params.length + 1;
    const searchClause = searchableColumns.map((col) => `${col} ILIKE $${searchParamIndex}`).join(' OR ');
    conditions.push(`(${searchClause})`);
    params.push(`%${search}%`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = /^[a-zA-Z_]+$/.test(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `SELECT ${columns} FROM ${table} ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${
    params.length + 1
  } OFFSET $${params.length + 2}`;
  const dataParams = [...params, limit, offset];

  const countSql = `SELECT COUNT(*) FROM ${table} ${whereClause}`;

  return { dataSql, dataParams, countSql, countParams: params };
}

module.exports = { buildListQuery };
