const express = require('express');
const router = express.Router();
const payrollController = require('./payroll.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');

router.use(authMiddleware.isAuthenticated);
router.use(rbacMiddleware.hasRole('admin', 'hr', 'finance'));

router.get('/', payrollController.index);
router.get('/run', payrollController.runForm);
router.post('/run', payrollController.run);
router.get('/:id', payrollController.detail);
router.post('/:id/mark-paid', payrollController.markPaid);

module.exports = router;
