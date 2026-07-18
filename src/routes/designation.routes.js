const { Router } = require('express');
const controller = require('../controllers/designation.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/designation.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('designation.manage'), paginate, controller.listDesignations);
router.post('/', requirePermission('designation.manage'), validate(v.createDesignation), controller.createDesignation);
router.get('/:id', requirePermission('designation.manage'), controller.getDesignation);
router.patch('/:id', requirePermission('designation.manage'), validate(v.updateDesignation), controller.updateDesignation);
router.delete('/:id', requirePermission('designation.manage'), controller.deleteDesignation);

module.exports = router;
