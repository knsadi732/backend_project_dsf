const { Router } = require('express');
const controller = require('../controllers/company.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/company.validator');

const router = Router();

// This router is mounted at bare '/' in routes/index.js (to expose /company,
// /branches, /warehouses, /settings without an extra prefix), which means it
// receives every request that no earlier, more specific router claimed. So
// auth is applied per-route here rather than via router.use(authenticate, ...)
// — an unconditional router-level middleware would intercept genuinely
// unmatched paths too and mask them behind AUTH_004 instead of a 404.
const guard = [authenticate, tenantContext];

router.get('/company', ...guard, requirePermission('company.manage'), controller.getCompany);
router.patch('/company', ...guard, requirePermission('company.manage'), validate(v.updateCompany), controller.updateCompany);

router.get('/branches', ...guard, requirePermission('company.manage'), paginate, controller.listBranches);
router.post('/branches', ...guard, requirePermission('company.manage'), validate(v.createBranch), controller.createBranch);
router.get('/branches/:id', ...guard, requirePermission('company.manage'), controller.getBranch);
router.patch('/branches/:id', ...guard, requirePermission('company.manage'), validate(v.updateBranch), controller.updateBranch);
router.delete('/branches/:id', ...guard, requirePermission('company.manage'), controller.deleteBranch);

router.get('/warehouses', ...guard, requirePermission('company.manage'), paginate, controller.listWarehouses);
router.post('/warehouses', ...guard, requirePermission('company.manage'), validate(v.createWarehouse), controller.createWarehouse);
router.get('/warehouses/:id', ...guard, requirePermission('company.manage'), controller.getWarehouse);
router.patch('/warehouses/:id', ...guard, requirePermission('company.manage'), validate(v.updateWarehouse), controller.updateWarehouse);
router.delete('/warehouses/:id', ...guard, requirePermission('company.manage'), controller.deleteWarehouse);

router.get('/settings', ...guard, requirePermission('settings.manage'), controller.getSettings);
router.patch('/settings', ...guard, requirePermission('settings.manage'), validate(v.updateSettings), controller.updateSettings);

module.exports = router;
