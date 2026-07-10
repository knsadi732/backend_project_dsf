const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const authValidator = require('../validators/auth.validator');

const router = Router();

router.post('/login', validate(authValidator.login), authController.login);
router.post('/refresh', validate(authValidator.refresh), authController.refresh);
router.post('/logout', validate(authValidator.logout), authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
