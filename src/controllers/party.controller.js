const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const customerService = require('../services/customer.service');
const vendorService = require('../services/vendor.service');

const listCustomers = asyncHandler(async (req, res) => {
  const { rows, meta } = await customerService.listCustomers(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Customers list.', data: rows, meta });
});
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomer(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Customer detail.', data: customer });
});
const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Customer created.', data: customer, statusCode: 201 });
});
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Customer updated.', data: customer });
});
const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Customer deleted.' });
});

const listVendors = asyncHandler(async (req, res) => {
  const { rows, meta } = await vendorService.listVendors(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Vendors list.', data: rows, meta });
});
const getVendor = asyncHandler(async (req, res) => {
  const vendor = await vendorService.getVendor(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Vendor detail.', data: vendor });
});
const createVendor = asyncHandler(async (req, res) => {
  const vendor = await vendorService.createVendor(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Vendor created.', data: vendor, statusCode: 201 });
});
const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await vendorService.updateVendor(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Vendor updated.', data: vendor });
});
const deleteVendor = asyncHandler(async (req, res) => {
  await vendorService.deleteVendor(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Vendor deleted.' });
});

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
};
