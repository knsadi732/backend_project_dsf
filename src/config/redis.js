const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redisClient = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  maxRetriesPerRequest: null,
});

redisClient.on('error', (err) => logger.error('Redis client error', err));
redisClient.on('connect', () => logger.info('Redis connected'));

const CACHE_PREFIX = {
  SESSION: 'cache:session:',
  PERMISSION: 'cache:permission:',
  PRODUCT: 'cache:product:',
  DASHBOARD: 'cache:dashboard:',
  SETTINGS: 'cache:settings:',
};

const CACHE_TTL_SECONDS = {
  SESSION: 60 * 60 * 24 * 7, // 7 days, mirrors refresh token lifetime
  PERMISSION: 60 * 30,
  PRODUCT: 60 * 60,
  DASHBOARD: 60 * 15, // plan.md: 15-minute TTL loop
  SETTINGS: 60 * 60,
};

module.exports = { redisClient, CACHE_PREFIX, CACHE_TTL_SECONDS };
