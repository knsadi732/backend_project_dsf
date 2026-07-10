const auditRepository = require('../repositories/audit.repository');
const logger = require('../utils/logger');

const REDACTED_FIELDS = new Set(['password', 'refreshToken', 'passwordHash']);

function redact(body) {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  for (const key of Object.keys(clone)) {
    if (REDACTED_FIELDS.has(key)) clone[key] = '[REDACTED]';
  }
  return clone;
}

/**
 * Fire-and-forget request trace into audit_logs (plan.md Service-03 — Core
 * Audit Module). Mounted globally; req.user is populated by `authenticate`
 * on protected routes by the time the response finishes.
 */
function auditLogger(req, res, next) {
  if (req.path === '/health') return next();

  res.on('finish', () => {
    auditRepository
      .record({
        companyId: req.user?.companyId || null,
        userId: req.user?.id || null,
        action: `${req.method} ${req.path}`,
        httpMethod: req.method,
        route: req.originalUrl,
        requestPayload: ['POST', 'PUT', 'PATCH'].includes(req.method) ? redact(req.body) : undefined,
        statusCode: res.statusCode,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })
      .catch((err) => logger.error('Audit log write failed', err));
  });

  next();
}

module.exports = auditLogger;
