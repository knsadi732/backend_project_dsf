const logger = require('../utils/logger');
const { buildPaginationMeta } = require('../utils/pagination');
const attendanceRepository = require('../repositories/attendance.repository');

/**
 * Called from auth.service.js on every successful login. Attendance is a
 * side effect of logging in, not the reason for it — a failure here must
 * never block the login response, so callers should not await-propagate
 * errors from this function into the login flow.
 */
async function markCheckIn(companyId, userId, meta = {}) {
  try {
    return await attendanceRepository.markCheckIn(companyId, userId, meta);
  } catch (err) {
    logger.error('Failed to mark attendance on login', err);
    return null;
  }
}

async function listAttendance(companyId, pagination, filters) {
  const { rows, totalRecords } = await attendanceRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

module.exports = { markCheckIn, listAttendance };
