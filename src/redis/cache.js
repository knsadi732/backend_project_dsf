const { redisClient } = require('../config/redis');

/**
 * Thin JSON get/set/del wrapper shared by the five cache tiers
 * (Session/Permission/Product/Dashboard/Settings — plan.md Chapter 6).
 * Callers supply their own prefixed key + TTL from config/redis.js.
 */
async function getJSON(key) {
  const raw = await redisClient.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function setJSON(key, value, ttlSeconds) {
  const raw = JSON.stringify(value);
  if (ttlSeconds) {
    await redisClient.set(key, raw, 'EX', ttlSeconds);
  } else {
    await redisClient.set(key, raw);
  }
}

async function del(key) {
  await redisClient.del(key);
}

module.exports = { getJSON, setJSON, del };
