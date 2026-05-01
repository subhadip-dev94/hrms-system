const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');

router.use(authMiddleware.isAuthenticated);
router.use(rbacMiddleware.hasRole('admin', 'hr', 'finance', 'manager'));

// ── Named export routes (before parameterised) ────────────────────────────────
router.get('/attendance/export', reportsController.attendanceExport);
router.get('/leave/export', reportsController.leaveExport);
router.get('/payroll/export', reportsController.payrollExport);
router.get('/headcount/export', reportsController.headcountExport);

// ── Report pages ──────────────────────────────────────────────────────────────
router.get('/', reportsController.index);
router.get('/attendance', reportsController.attendance);
router.get('/leave', reportsController.leave);
router.get('/payroll', rbacMiddleware.hasRole('admin', 'hr', 'finance'), reportsController.payroll);
router.get('/performance', reportsController.performance);
router.get('/headcount', reportsController.headcount);

module.exports = router;
