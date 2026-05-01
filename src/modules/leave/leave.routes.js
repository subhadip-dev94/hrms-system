const express = require('express');
const router = express.Router();
const leaveController = require('./leave.controller');
const { isAuthenticated } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');

router.use(isAuthenticated);

// ── Employee & above ──────────────────────────────────────────────────────────
router.get('/my', leaveController.my);
router.get('/create', leaveController.getCreate);
router.post('/', leaveController.postCreate);
router.put('/:id/cancel', leaveController.cancel);

// ── Manager / HR / Admin ──────────────────────────────────────────────────────
router.get(
  '/approvals',
  rbac.hasRole('admin', 'hr', 'manager'),
  leaveController.approvals
);
router.put(
  '/:id/approve',
  rbac.hasRole('admin', 'hr', 'manager'),
  leaveController.approve
);
router.put(
  '/:id/reject',
  rbac.hasRole('admin', 'hr', 'manager'),
  leaveController.reject
);

// ── HR / Admin only ───────────────────────────────────────────────────────────
router.get('/', leaveController.index);

module.exports = router;
