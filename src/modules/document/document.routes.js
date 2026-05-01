const express = require('express');
const router = express.Router();
const documentController = require('./document.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const { uploadDocument } = require('../../config/cloudinary');

router.use(authMiddleware.isAuthenticated);

// ─── Cloudinary document upload middleware ────────────────────────────────
const handleDocumentUpload = (req, res, next) => {
  uploadDocument(req, res, (err) => {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    next();
  });
};

// ── Named static routes FIRST ─────────────────────────────────────────────
router.get('/my', documentController.my);

router.get(
  '/upload',
  rbacMiddleware.hasRole('admin', 'hr'),
  documentController.uploadForm
);
router.post(
  '/upload',
  rbacMiddleware.hasRole('admin', 'hr'),
  handleDocumentUpload,
  documentController.upload
);

// ── Index (HR/admin) ──────────────────────────────────────────────────────
router.get(
  '/',
  rbacMiddleware.hasRole('admin', 'hr'),
  documentController.index
);

// ── Parameterised routes ──────────────────────────────────────────────────
router.get('/:id/download', documentController.download);

router.delete(
  '/:id',
  rbacMiddleware.hasRole('admin', 'hr'),
  documentController.remove
);

router.put(
  '/:id/visibility',
  rbacMiddleware.hasRole('admin', 'hr'),
  documentController.toggleVisibility
);

module.exports = router;
