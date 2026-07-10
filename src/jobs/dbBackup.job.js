const { execFile } = require('child_process');
const fsp = require('fs/promises');
const path = require('path');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Daily Backup (plan.md Service-05): dumps the database via pg_dump.
 * Writes to STORAGE_ROOT/backups locally; swap the final write step for an
 * S3 upload (with encryption) once cloud credentials are available.
 */
async function runDbBackup() {
  const backupDir = path.join(env.documents.storageRoot, 'backups');
  await fsp.mkdir(backupDir, { recursive: true });

  const fileName = `backup-${env.db.database}-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
  const destPath = path.join(backupDir, fileName);

  return new Promise((resolve) => {
    execFile(
      'pg_dump',
      ['-h', env.db.host, '-p', String(env.db.port), '-U', env.db.user, '-d', env.db.database, '-f', destPath],
      { env: { ...process.env, PGPASSWORD: env.db.password } },
      (err) => {
        if (err) {
          logger.error('DB backup failed (is pg_dump installed and on PATH?)', err);
          return resolve({ success: false, error: err.message });
        }
        logger.info(`DB backup written to ${destPath}`);
        resolve({ success: true, destPath });
      },
    );
  });
}

module.exports = runDbBackup;
