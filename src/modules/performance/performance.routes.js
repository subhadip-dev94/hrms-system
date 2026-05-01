const express = require('express');
const router = express.Router();
const performanceController = require('./performance.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');

router.use(authMiddleware.isAuthenticated);

// ── Static/named routes FIRST (before /:id) ───────────────────────────────

// All roles
router.get('/my-reviews', performanceController.myReviews);

// Manager/HR/Admin only
router.get(
  '/team',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  performanceController.team
);
router.get(
  '/create',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  performanceController.createForm
);
router.post(
  '/',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  performanceController.create
);

// Review sub-routes (static before /:id)
router.get(
  '/review/new',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  performanceController.reviewForm
);
router.post(
  '/review',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  performanceController.submitReview
);
router.get('/review/:id', performanceController.viewReview);
router.put('/review/:id/acknowledge', performanceController.acknowledgeReview);

// My KPIs index (all roles)
router.get('/', performanceController.index);

// ── Parameterised KPI routes ───────────────────────────────────────────────
router.get(
  '/:id/edit',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  performanceController.editForm
);
router.put(
  '/:id/progress',
  performanceController.updateProgress
);
router.put(
  '/:id',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  performanceController.update
);
router.delete(
  '/:id',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  performanceController.cancel
);

module.exports = router;
