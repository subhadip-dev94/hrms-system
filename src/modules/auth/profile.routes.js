const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { isAuthenticated } = require('../../middlewares/auth.middleware');
const { uploadProfilePhoto } = require('../../config/cloudinary');

router.get('/', isAuthenticated, authController.getProfile);

router.post('/', isAuthenticated, (req, res, next) => {
  uploadProfilePhoto(req, res, (err) => {
    if (err) { req.flash('error', err.message); return res.redirect('/profile'); }
    next();
  });
}, authController.postUpdateProfile);

module.exports = router;
