const { query } = require('../config/db');
const logger = require('../utils/logger');

/** Expired Session Cleanup (plan.md Service-05): discards stale JWT session rows. */
async function runSessionCleanup() {
  const { rowCount } = await query(
    `DELETE FROM sessions WHERE expires_at < now() OR revoked_at < now() - INTERVAL '30 days'`,
  );
  logger.info(`Session cleanup removed ${rowCount} row(s).`);
  return { removed: rowCount };
}

module.exports = runSessionCleanup;
