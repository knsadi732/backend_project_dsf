const { ERROR_CODES } = require('../constants/errorCodes');

/**
 * Application-level error carrying a registered error_code.
 * Thrown anywhere in services/repositories and caught by middlewares/errorHandler.js,
 * which maps it onto the standard error response envelope (plan.md Chapter 1).
 */
class AppError extends Error {
  constructor(errorCode, details = [], overrideMessage) {
    const entry = ERROR_CODES[errorCode] || ERROR_CODES.COMMON_002;
    super(overrideMessage || entry.message);
    this.name = 'AppError';
    this.errorCode = ERROR_CODES[errorCode] ? errorCode : 'COMMON_002';
    this.httpStatus = entry.httpStatus;
    this.details = details;
  }
}

module.exports = AppError;
