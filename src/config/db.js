const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: env.db.max,
  ssl: env.db.ssl,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', err);
});

/**
 * Run a single query against the pool.
 */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run a callback inside a transaction on a dedicated client.
 * Every inventory/finance write path must use this helper (plan.md Chapter 4 —
 * Transaction Management) so a mid-execution failure rolls back atomically.
 *
 * @param {(client: import('pg').PoolClient) => Promise<any>} work
 * @param {{ isolationLevel?: 'READ COMMITTED'|'REPEATABLE READ'|'SERIALIZABLE' }} [options]
 */
async function withTransaction(work, options = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (options.isolationLevel) {
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
    }
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
