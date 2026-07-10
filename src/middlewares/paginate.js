const { parsePagination } = require('../utils/pagination');

/**
 * Normalizes the mandatory list-endpoint query params onto req.pagination
 * (plan.md Chapter 1 — Pagination Standard). Mount on every List route.
 */
function paginate(req, res, next) {
  req.pagination = parsePagination(req.query);
  next();
}

module.exports = paginate;
