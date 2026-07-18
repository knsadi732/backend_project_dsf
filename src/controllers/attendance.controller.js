const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const attendanceService = require('../services/attendance.service');

const listAttendance = asyncHandler(async (req, res) => {
  const { rows, meta } = await attendanceService.listAttendance(req.tenant.companyId, req.pagination, {
    userId: req.query.user_id,
    from: req.query.from,
    to: req.query.to,
  });
  return sendSuccess(res, { message: 'Attendance list.', data: rows, meta });
});

module.exports = { listAttendance };
