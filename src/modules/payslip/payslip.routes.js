const express = require('express');
const router = express.Router();
const payslipController = require('./payslip.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware.isAuthenticated);

router.get('/my', payslipController.myPayslips);
router.get('/:id', payslipController.view);
router.get('/:id/download', payslipController.download);
router.post('/:id/email', payslipController.email);

module.exports = router;
