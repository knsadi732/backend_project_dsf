const AppError = require('./AppError');

/**
 * Enforces the System Level Core State Machine Rules (plan.md Chapter 4):
 * a status may only advance to the very next step in its declared pipeline.
 * Shared by orders and purchase orders.
 */
function assertTransition(pipeline, currentStatus, nextStatus, errorCode) {
  const currentIndex = pipeline.indexOf(currentStatus);
  const nextIndex = pipeline.indexOf(nextStatus);
  if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
    throw new AppError(errorCode);
  }
}

module.exports = { assertTransition };
