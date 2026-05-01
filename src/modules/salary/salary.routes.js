const express = require('express');
const router = express.Router();
const salaryController = require('./salary.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');

// All salary routes require finance/hr/admin
router.use(authMiddleware.isAuthenticated);
router.use(rbacMiddleware.hasRole('admin', 'hr', 'finance'));

router.get('/', salaryController.index);
router.get('/create', salaryController.createForm);
router.post('/create', salaryController.create);
router.get('/:employeeId/edit', salaryController.editForm);
router.put('/:employeeId', salaryController.update);

module.exports = router;
