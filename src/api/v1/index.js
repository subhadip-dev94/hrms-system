const express = require('express');
const router = express.Router();

router.use('/auth',         require('./auth.api'));
router.use('/employees',    require('./employee.api'));
router.use('/departments',  require('./department.api'));
router.use('/holidays',     require('./holiday.api'));
router.use('/attendance',   require('./attendance.api'));
router.use('/leaves',       require('./leave.api'));
router.use('/salary',       require('./salary.api'));
router.use('/payroll',      require('./payroll.api'));
router.use('/payslip',      require('./payslip.api'));
router.use('/timesheet',    require('./timesheet.api'));
router.use('/performance',  require('./performance.api'));
router.use('/recruitment',  require('./recruitment.api'));
router.use('/expense',      require('./expense.api'));
router.use('/announcements',require('./announcement.api'));
router.use('/documents',    require('./document.api'));
router.use('/offboarding',  require('./offboarding.api'));
router.use('/reports',      require('./reports.api'));

module.exports = router;
