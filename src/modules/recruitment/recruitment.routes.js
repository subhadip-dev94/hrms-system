const express = require('express');
const router = express.Router();
const recruitmentController = require('./recruitment.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const { uploadResume } = require('../../config/cloudinary');

router.use(authMiddleware.isAuthenticated);

// ── Named static routes FIRST ─────────────────────────────────────────────
router.get(
  '/create',
  rbacMiddleware.hasRole('admin', 'hr'),
  recruitmentController.createForm
);
router.post(
  '/',
  rbacMiddleware.hasRole('admin', 'hr'),
  recruitmentController.create
);

// Candidate sub-routes (static before /:id)
router.get('/candidate/:id', recruitmentController.candidateDetail);
router.put(
  '/candidate/:id/stage',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  recruitmentController.moveStage
);
router.post(
  '/candidate/:id/interview',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  recruitmentController.scheduleInterview
);
router.put(
  '/candidate/:id/offer',
  rbacMiddleware.hasRole('admin', 'hr'),
  recruitmentController.sendOffer
);
router.get(
  '/candidate/:id/convert',
  rbacMiddleware.hasRole('admin', 'hr'),
  recruitmentController.convertForm
);
router.post(
  '/candidate/:id/convert',
  rbacMiddleware.hasRole('admin', 'hr'),
  recruitmentController.convert
);

// Job list
router.get('/', recruitmentController.index);

// ── Parameterised job routes ──────────────────────────────────────────────
router.get('/:id', recruitmentController.detail);
router.get(
  '/:id/edit',
  rbacMiddleware.hasRole('admin', 'hr'),
  recruitmentController.editForm
);
router.put(
  '/:id/status',
  rbacMiddleware.hasRole('admin', 'hr'),
  recruitmentController.updateStatus
);
router.put(
  '/:id',
  rbacMiddleware.hasRole('admin', 'hr'),
  recruitmentController.update
);
router.post(
  '/:id/candidate',
  rbacMiddleware.hasRole('admin', 'hr', 'manager'),
  (req, res, next) => {
    uploadResume(req, res, (err) => {
      if (err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      next();
    });
  },
  recruitmentController.addCandidate
);

module.exports = router;
