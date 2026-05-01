const express = require('express');
const router = express.Router();
const offboardingController = require('./offboarding.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');

router.use(authMiddleware.isAuthenticated);
router.use(rbacMiddleware.hasRole('admin', 'hr'));

// ── Named static routes FIRST ─────────────────────────────────────────────
router.get('/create', offboardingController.createForm);
router.post('/', offboardingController.create);

// ── Index ─────────────────────────────────────────────────────────────────
router.get('/', offboardingController.index);

// ── Parameterised routes ──────────────────────────────────────────────────
router.get('/:id', offboardingController.detail);

router.put('/:id/checklist/:itemIndex', offboardingController.markChecklist);
router.put('/:id/checklist/:itemIndex/unmark', offboardingController.unmarkChecklist);
router.put('/:id/interview', offboardingController.saveInterview);
router.put('/:id/settlement', offboardingController.saveSettlement);
router.put('/:id/complete', offboardingController.complete);
router.put('/:id/cancel', offboardingController.cancel);

module.exports = router;
