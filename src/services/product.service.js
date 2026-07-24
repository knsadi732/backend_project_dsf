const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const { CACHE_PREFIX, CACHE_TTL_SECONDS } = require('../config/redis');
const cache = require('../redis/cache');
const productRepository = require('../repositories/product.repository');

async function listProducts(companyId, pagination, filters) {
  const { rows, totalRecords } = await productRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/** Product Cache tier (plan.md Chapter 6) — read-heavy catalog lookups. */
async function getProduct(companyId, id) {
  const cacheKey = `${CACHE_PREFIX.PRODUCT}${companyId}:${id}`;
  const cached = await cache.getJSON(cacheKey);
  if (cached) return cached;

  const product = await productRepository.findById(companyId, id);
  if (!product) throw new AppError('INV_002');

  await cache.setJSON(cacheKey, product, CACHE_TTL_SECONDS.PRODUCT);
  return product;
}

async function createProduct(companyId, payload, actorId) {
  return productRepository.create(companyId, payload, actorId);
}

async function updateProduct(companyId, id, payload, actorId) {
  const product = await productRepository.update(companyId, id, payload, actorId);
  if (!product) throw new AppError('INV_002');
  await cache.del(`${CACHE_PREFIX.PRODUCT}${companyId}:${id}`);
  return product;
}

async function deleteProduct(companyId, id, actorId) {
  const deleted = await productRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('INV_002');
  await cache.del(`${CACHE_PREFIX.PRODUCT}${companyId}:${id}`);
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
