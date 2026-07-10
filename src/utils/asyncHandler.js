/**
 * Wraps an async Express handler so rejected promises reach errorHandler middleware
 * instead of crashing the process or requiring try/catch in every controller.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
