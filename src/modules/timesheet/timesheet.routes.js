const express = require('express');
const router = express.Router();
const timesheetController = require('./timesheet.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');

router.use(authMiddleware.isAuthenticated);

// ── Static/named routes FIRST (before /:id) ───────────────────────────────
router.get('/log', timesheetController.logForm);
router.post('/', timesheetController.log);
router.get(
  '/report',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  timesheetController.report
);
router.get('/', timesheetController.index);

// ── Parameterised routes ───────────────────────────────────────────────────
router.get('/:id/edit', timesheetController.editForm);
router.put('/:id/submit', timesheetController.submit);
router.put(
  '/:id/approve',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  timesheetController.approve
);
router.put(
  '/:id/reject',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  timesheetController.reject
);
router.put('/:id', timesheetController.update);
router.delete('/:id', timesheetController.remove);

module.exports = router;
