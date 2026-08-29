const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const workOrderService = require('../services/workOrder.service');
const { getOverheadPerUnitForMonth } = require('../services/overheadAllocation.service');

const generateNumber = asyncHandler(async (req, res) => {
  const workOrderNumber = workOrderService.generateWorkOrderNumber();
  return sendSuccess(res, { message: 'Generated work order number.', data: { workOrderNumber } });
});

const create = asyncHandler(async (req, res) => {
  const workOrder = await workOrderService.createWorkOrder(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Work order created.', data: workOrder, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await workOrderService.listWorkOrders(req.tenant.companyId, req.pagination, { stage: req.query.stage });
  return sendSuccess(res, { message: 'Work orders list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const workOrder = await workOrderService.getWorkOrder(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Work order detail.', data: workOrder });
});

const update = asyncHandler(async (req, res) => {
  const workOrder = await workOrderService.updateWorkOrder(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Work order updated.', data: workOrder });
});

const remove = asyncHandler(async (req, res) => {
  await workOrderService.deleteWorkOrder(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Work order deleted.' });
});

const advanceFloorStage = asyncHandler(async (req, res) => {
  const workOrder = await workOrderService.advanceFloorStage(req.tenant.companyId, req.params.id, req.body.floorStage, req.user.id);
  return sendSuccess(res, { message: 'Floor stage advanced.', data: workOrder });
});

const overheadPerUnit = asyncHandler(async (req, res) => {
  const data = await getOverheadPerUnitForMonth(req.tenant.companyId);
  return sendSuccess(res, { message: 'Current month overhead per unit.', data });
});

module.exports = { generateNumber, create, list, getOne, update, remove, advanceFloorStage, overheadPerUnit };
