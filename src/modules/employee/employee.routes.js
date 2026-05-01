const express = require('express');
const router = express.Router();
const employeeController = require('./employee.controller');
const { isAuthenticated } = require('../../middlewares/auth.middleware');
const { uploadProfilePhoto } = require('../../config/cloudinary');

// ─── All routes require authentication ───────────────────────────────────────
router.use(isAuthenticated);

router.get('/', employeeController.index);
router.get('/create', employeeController.getCreate);
router.post('/create', (req, res, next) => {
  uploadProfilePhoto(req, res, (err) => {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('/employees/create');
    }
    next();
  });
}, employeeController.postCreate);
router.get('/:id/edit', employeeController.getEdit);
router.put('/:id', (req, res, next) => {
  uploadProfilePhoto(req, res, (err) => {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    next();
  });
}, employeeController.postEdit);
router.delete('/:id', employeeController.softDelete);

module.exports = router;
