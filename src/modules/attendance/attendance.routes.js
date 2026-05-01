const express = require('express');
const router = express.Router();
const attendanceController = require('./attendance.controller');
const { isAuthenticated } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');

router.use(isAuthenticated);

router.get('/', attendanceController.index);
router.get('/my', attendanceController.my);
router.post('/checkin', attendanceController.checkIn);
router.post('/checkout', attendanceController.checkOut);
router.get('/report', rbac.isHRorAdmin, attendanceController.report);
router.post('/mark', rbac.isHRorAdmin, attendanceController.markAttendance);

module.exports = router;
