const AppError = require('../utils/AppError');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Terminal Express error handler — maps AppError instances (and anything else)
 * onto the standard error envelope (plan.md Chapter 1). Must be mounted last.
 */
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return sendError(res, {
      errorCode: err.errorCode,
      message: err.message,
      details: err.details,
      statusCode: err.httpStatus,
    });
  }

  logger.error('Unhandled error', err);
  return sendError(res, {
    errorCode: 'COMMON_002',
    message: 'An unexpected internal error occurred.',
    statusCode: 500,
  });
}

function notFoundHandler(req, res) {
  return sendError(res, {
    errorCode: 'COMMON_001',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
  });
}

module.exports = { errorHandler, notFoundHandler };
