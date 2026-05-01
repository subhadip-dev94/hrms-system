const express = require('express');
const router = express.Router();
const holidayController = require('./holiday.controller');
const { isAuthenticated } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');

router.use(isAuthenticated);

// All authenticated users can view holidays
router.get('/', holidayController.index);

// Only admin/hr can manage holidays
router.get('/create', rbac.isHRorAdmin, holidayController.getCreate);
router.post('/', rbac.isHRorAdmin, holidayController.postCreate);
router.delete('/:id', rbac.isHRorAdmin, holidayController.deleteHoliday);

module.exports = router;
