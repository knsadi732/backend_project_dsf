const { Router } = require('express');
const controller = require('../controllers/materialIssueRequest.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('material_issue_request.view'), paginate, controller.list);
router.get('/:id', requirePermission('material_issue_request.view'), controller.getOne);
router.patch('/:id/approve', requirePermission('material_issue_request.approve'), controller.approve);
router.patch('/:id/reject', requirePermission('material_issue_request.approve'), controller.reject);
router.patch('/:id/issue', requirePermission('material_issue_request.issue'), controller.issue);

module.exports = router;
