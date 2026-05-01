const express = require('express');
const router = express.Router();
const announcementController = require('./announcement.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');

router.use(authMiddleware.isAuthenticated);

// ── Named static routes FIRST ─────────────────────────────────────────────
router.get(
  '/create',
  rbacMiddleware.hasRole('admin', 'hr'),
  announcementController.createForm
);
router.post(
  '/',
  rbacMiddleware.hasRole('admin', 'hr'),
  announcementController.create
);

// ── Parameterised routes ──────────────────────────────────────────────────
router.get('/', announcementController.index);

router.post(
  '/:id/pin',
  rbacMiddleware.hasRole('admin', 'hr'),
  announcementController.togglePin
);

router.post('/:id/read', announcementController.markRead);

router.delete(
  '/:id',
  rbacMiddleware.hasRole('admin', 'hr'),
  announcementController.remove
);

module.exports = router;
