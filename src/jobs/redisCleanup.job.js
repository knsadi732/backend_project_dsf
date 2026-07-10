const { redisClient, CACHE_PREFIX } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Redis Cleanup (plan.md Service-05). All cache tiers are written with an
 * explicit TTL (config/redis.js CACHE_TTL_SECONDS) so Redis expires them on
 * its own; this sweep only catches keys that ended up without one (e.g. a
 * bug upstream) and evicts them defensively.
 */
async function runRedisCleanup() {
  let evicted = 0;

  for (const prefix of Object.values(CACHE_PREFIX)) {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = nextCursor;
      for (const key of keys) {
        const ttl = await redisClient.ttl(key);
        if (ttl === -1) {
          await redisClient.del(key);
          evicted += 1;
        }
      }
    } while (cursor !== '0');
  }

  logger.info(`Redis cleanup evicted ${evicted} TTL-less key(s).`);
  return { evicted };
}

module.exports = runRedisCleanup;
