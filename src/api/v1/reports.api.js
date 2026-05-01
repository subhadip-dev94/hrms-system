const express = require('express');
const router = express.Router();
const reportsService = require('../../modules/reports/reports.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiError } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Analytics and reporting
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /reports/attendance:
 *   get:
 *     summary: Attendance report data
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Attendance report
 */
router.get('/attendance', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const data = await reportsService.getAttendanceReport(req.query);
    return apiSuccess(res, 'Attendance report', data);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /reports/leave:
 *   get:
 *     summary: Leave report data
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string }
 *       - in: query
 *         name: leaveType
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave report
 */
router.get('/leave', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const data = await reportsService.getLeaveReport(req.query);
    return apiSuccess(res, 'Leave report', data);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /reports/payroll:
 *   get:
 *     summary: Payroll report data
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payroll report
 */
router.get('/payroll', apiAuthorize('admin', 'hr', 'finance'), async (req, res) => {
  try {
    const data = await reportsService.getPayrollReport(req.query);
    return apiSuccess(res, 'Payroll report', data);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /reports/performance:
 *   get:
 *     summary: Performance report data
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string }
 *       - in: query
 *         name: quarter
 *         schema: { type: string }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Performance report
 */
router.get('/performance', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const data = await reportsService.getPerformanceReport(req.query);
    return apiSuccess(res, 'Performance report', data);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /reports/headcount:
 *   get:
 *     summary: Headcount report data
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Headcount report
 */
router.get('/headcount', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const data = await reportsService.getHeadcountReport(req.query);
    return apiSuccess(res, 'Headcount report', data);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

module.exports = router;
