const { query } = require('../config/db');

async function create({ companyId, userId, refreshTokenHash, deviceSignature, ipAddress, userAgent, expiresAt }) {
  const { rows } = await query(
    `INSERT INTO sessions (company_id, user_id, refresh_token_hash, device_signature, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, expires_at`,
    [companyId, userId, refreshTokenHash, deviceSignature || null, ipAddress || null, userAgent || null, expiresAt],
  );
  return rows[0];
}

async function findActiveByRefreshHash(refreshTokenHash) {
  const { rows } = await query(
    `SELECT id, company_id, user_id, expires_at, revoked_at
     FROM sessions
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
     LIMIT 1`,
    [refreshTokenHash],
  );
  return rows[0] || null;
}

async function revokeById(id) {
  await query(`UPDATE sessions SET revoked_at = now(), updated_at = now() WHERE id = $1`, [id]);
}

async function revokeByRefreshHash(refreshTokenHash) {
  await query(
    `UPDATE sessions SET revoked_at = now(), updated_at = now()
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
    [refreshTokenHash],
  );
}

module.exports = { create, findActiveByRefreshHash, revokeById, revokeByRefreshHash };
