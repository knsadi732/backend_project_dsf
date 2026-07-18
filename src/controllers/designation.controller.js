const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const designationService = require('../services/designation.service');

const listDesignations = asyncHandler(async (req, res) => {
  const { rows, meta } = await designationService.listDesignations(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Designations list.', data: rows, meta });
});

const getDesignation = asyncHandler(async (req, res) => {
  const designation = await designationService.getDesignation(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Designation detail.', data: designation });
});

const createDesignation = asyncHandler(async (req, res) => {
  const designation = await designationService.createDesignation(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Designation created.', data: designation, statusCode: 201 });
});

const updateDesignation = asyncHandler(async (req, res) => {
  const designation = await designationService.updateDesignation(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Designation updated.', data: designation });
});

const deleteDesignation = asyncHandler(async (req, res) => {
  await designationService.deleteDesignation(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Designation deleted.' });
});

module.exports = { listDesignations, getDesignation, createDesignation, updateDesignation, deleteDesignation };
