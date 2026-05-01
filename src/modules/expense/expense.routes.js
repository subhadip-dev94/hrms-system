const express = require('express');
const router = express.Router();
const expenseController = require('./expense.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const { uploadReceipt } = require('../../config/cloudinary');

router.use(authMiddleware.isAuthenticated);

// ─── Cloudinary receipt upload middleware ──────────────────────────────────
const handleReceiptUpload = (req, res, next) => {
  uploadReceipt(req, res, (err) => {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    next();
  });
};

// ── Named static routes FIRST ─────────────────────────────────────────────
router.get('/create', expenseController.createForm);
router.post('/', handleReceiptUpload, expenseController.create);

router.get(
  '/approvals',
  rbacMiddleware.hasRole('admin', 'hr', 'finance', 'manager'),
  expenseController.approvals
);

router.get(
  '/all',
  rbacMiddleware.hasRole('admin', 'hr', 'finance'),
  expenseController.all
);

// ── Parameterised routes ──────────────────────────────────────────────────
router.get('/', expenseController.index);
router.get('/:id', expenseController.detail);
router.get('/:id/edit', expenseController.editForm);
router.put('/:id', handleReceiptUpload, expenseController.update);
router.delete('/:id', expenseController.remove);

router.post('/:id/submit', expenseController.submit);

router.post(
  '/:id/approve',
  rbacMiddleware.hasRole('admin', 'hr', 'finance', 'manager'),
  expenseController.approve
);

router.post(
  '/:id/reject',
  rbacMiddleware.hasRole('admin', 'hr', 'finance', 'manager'),
  expenseController.reject
);

router.post(
  '/:id/pay',
  rbacMiddleware.hasRole('admin', 'finance'),
  expenseController.markPaid
);

module.exports = router;
