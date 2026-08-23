const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const machineService = require('../services/machine.service');

const create = asyncHandler(async (req, res) => {
  const machine = await machineService.createMachine(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Machine created.', data: machine, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await machineService.listMachines(req.tenant.companyId, req.pagination, {
    status: req.query.status,
    search: req.pagination.search,
  });
  return sendSuccess(res, { message: 'Machines list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const machine = await machineService.getMachine(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Machine detail.', data: machine });
});

const update = asyncHandler(async (req, res) => {
  const machine = await machineService.updateMachine(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Machine updated.', data: machine });
});

const remove = asyncHandler(async (req, res) => {
  await machineService.deleteMachine(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Machine deleted.' });
});

const reportDown = asyncHandler(async (req, res) => {
  const result = await machineService.reportDown(req.tenant.companyId, req.params.id, req.body.reason, req.user.id);
  return sendSuccess(res, { message: 'Machine reported down.', data: result });
});

const resolveDowntime = asyncHandler(async (req, res) => {
  const machine = await machineService.resolveDowntime(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Machine downtime resolved.', data: machine });
});

const listDowntimeEvents = asyncHandler(async (req, res) => {
  const { rows, meta } = await machineService.listDowntimeEvents(req.tenant.companyId, req.pagination, { machineId: req.query.machine_id });
  return sendSuccess(res, { message: 'Downtime events list.', data: rows, meta });
});

module.exports = { create, list, getOne, update, remove, reportDown, resolveDowntime, listDowntimeEvents };
