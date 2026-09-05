// override: true — a stray OS/session-level env var (e.g. IS_TEST set once
// in a long-lived terminal) must never silently beat what's in .env, or the
// app can end up pointed at the wrong database with no visible error.
require('dotenv').config({ override: true });
const path = require('path');

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${parseInt(process.env.PORT || '4000', 10)}`,

  db: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    // IS_TEST defaults to true (safer default — an unset/misconfigured
    // value never accidentally lands on the production database).
    // PGDATABASE is still honored on its own as a fallback for any
    // environment that hasn't been split into PGDATABASE_TEST/_PRODUCTION.
    database:
      process.env.IS_TEST === 'false'
        ? required('PGDATABASE_PRODUCTION', process.env.PGDATABASE)
        : required('PGDATABASE_TEST', process.env.PGDATABASE || 'ds_footwear_erp'),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
    pgDumpPath: process.env.PG_DUMP_PATH || 'pg_dump',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  auth: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },

  documents: {
    storageRoot: process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage'),
    signingSecret: process.env.DOC_SIGNING_SECRET || 'dev_doc_signing_secret',
    presignedUrlExpiresIn: process.env.DOC_PRESIGNED_URL_EXPIRES_IN || '5m',
    maxUploadSizeMb: parseInt(process.env.DOC_MAX_UPLOAD_SIZE_MB || '10', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
};
