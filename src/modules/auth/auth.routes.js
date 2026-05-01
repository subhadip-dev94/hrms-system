const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { isAuthenticated } = require('../../middlewares/auth.middleware');
const { isHRorAdmin } = require('../../middlewares/rbac.middleware');

router.get('/login',  authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/logout', authController.logout);

// Change own password — all authenticated users
router.get('/change-password',  isAuthenticated, authController.getChangePassword);
router.post('/change-password', isAuthenticated, authController.postChangePassword);

// Manage passwords — Admin (all users) + HR (employees only)
router.get('/manage-passwords',          isAuthenticated, isHRorAdmin, authController.getManagePasswords);
router.post('/manage-passwords/:userId', isAuthenticated, isHRorAdmin, authController.postResetUserPassword);

module.exports = router;
