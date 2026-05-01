const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { isAuthenticated } = require('../../middlewares/auth.middleware');

router.use(isAuthenticated);
router.get('/', dashboardController.index);

module.exports = router;
