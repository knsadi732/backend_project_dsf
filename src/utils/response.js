/**
 * Standard response envelope (plan.md Chapter 1 — Global API Response Standard).
 * Controllers must use these helpers instead of calling res.json() directly.
 */
function sendSuccess(res, { message = 'Success', data = {}, meta = {}, statusCode = 200 } = {}) {
  return res.status(statusCode).json({ success: true, message, data, meta });
}

function sendError(res, { errorCode = 'COMMON_002', message, details = [], statusCode = 500 } = {}) {
  return res.status(statusCode).json({ success: false, error_code: errorCode, message, details });
}

module.exports = { sendSuccess, sendError };
