/**
 * Parses the mandatory list-endpoint query params (plan.md Chapter 1 — Pagination Standard).
 * Consumed via middlewares/paginate.js so controllers receive a normalized req.pagination.
 */
function parsePagination(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 200);
  const search = typeof query.search === 'string' ? query.search : '';
  const sortBy = typeof query.sort_by === 'string' && query.sort_by.trim() ? query.sort_by : 'created_at';
  const sortOrder = query.sort_order === 'asc' ? 'asc' : 'desc';

  let filters = {};
  if (query.filters) {
    try {
      filters = typeof query.filters === 'string' ? JSON.parse(query.filters) : query.filters;
    } catch (_err) {
      filters = {};
    }
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset, search, sortBy, sortOrder, filters };
}

/**
 * Builds the standard `meta` block for a paginated list response.
 */
function buildPaginationMeta({ page, limit, totalRecords }) {
  return {
    page,
    limit,
    total_records: totalRecords,
    total_pages: Math.max(Math.ceil(totalRecords / limit), 1),
  };
}

module.exports = { parsePagination, buildPaginationMeta };
