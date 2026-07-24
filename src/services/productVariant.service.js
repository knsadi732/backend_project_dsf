const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const { CACHE_PREFIX, CACHE_TTL_SECONDS } = require('../config/redis');
const cache = require('../redis/cache');
const productVariantRepository = require('../repositories/productVariant.repository');
const productRepository = require('../repositories/product.repository');

async function generateSku() {
  return productVariantRepository.peekSku();
}

async function listVariants(companyId, pagination, filters) {
  const { rows, totalRecords } = await productVariantRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/** Product Cache tier (plan.md Chapter 6) — read-heavy catalog lookups. */
async function getVariant(companyId, id) {
  const cacheKey = `${CACHE_PREFIX.PRODUCT}variant:${companyId}:${id}`;
  const cached = await cache.getJSON(cacheKey);
  if (cached) return cached;

  const variant = await productVariantRepository.findById(companyId, id);
  if (!variant) throw new AppError('INV_002');

  await cache.setJSON(cacheKey, variant, CACHE_TTL_SECONDS.PRODUCT);
  return variant;
}

async function createVariant(companyId, payload, actorId) {
  const product = await productRepository.findById(companyId, payload.productId);
  if (!product) throw new AppError('INV_002');
  return productVariantRepository.create(companyId, payload, actorId);
}

async function updateVariant(companyId, id, payload, actorId) {
  const variant = await productVariantRepository.update(companyId, id, payload, actorId);
  if (!variant) throw new AppError('INV_002');
  await cache.del(`${CACHE_PREFIX.PRODUCT}variant:${companyId}:${id}`);
  return variant;
}

async function deleteVariant(companyId, id, actorId) {
  const deleted = await productVariantRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('INV_002');
  await cache.del(`${CACHE_PREFIX.PRODUCT}variant:${companyId}:${id}`);
}

module.exports = { generateSku, listVariants, getVariant, createVariant, updateVariant, deleteVariant };
