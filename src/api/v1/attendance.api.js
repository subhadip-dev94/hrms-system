const express = require('express');
const router = express.Router();
const attendanceService = require('../../modules/attendance/attendance.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiError } = require('../../utils/response.util');
const { getPaginationParams } = require('../../utils/helper.util');

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance tracking
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /attendance/my:
 *   get:
 *     summary: Get my attendance for a month
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: My attendance records
 */
router.get('/my', async (req, res) => {
  try {
    const Attendance = require('../../modules/attendance/attendance.model');
    const { getMonthDateRange } = require('../../utils/helper.util');
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year,  10) || new Date().getFullYear();
    const { startDate, endDate } = getMonthDateRange(month, year);
    const records = await Attendance.find({
      employeeId: req.apiUser.employeeId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 }).lean();
    return apiSuccess(res, 'Attendance retrieved', records);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /attendance/checkin:
 *   post:
 *     summary: Check in
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-in recorded
 */
router.post('/checkin', async (req, res) => {
  try {
    const record = await attendanceService.checkIn(req.apiUser.employeeId);
    return apiSuccess(res, 'Checked in successfully', record);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /attendance/checkout:
 *   post:
 *     summary: Check out
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-out recorded
 */
router.post('/checkout', async (req, res) => {
  try {
    const record = await attendanceService.checkOut(req.apiUser.employeeId);
    return apiSuccess(res, 'Checked out successfully', record);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /attendance/report:
 *   get:
 *     summary: Monthly attendance summary report
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Attendance summary
 */
router.get('/report', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const summary = await attendanceService.getMonthlySummary(
      req.query.employeeId,
      parseInt(req.query.month, 10) || new Date().getMonth() + 1,
      parseInt(req.query.year,  10) || new Date().getFullYear()
    );
    return apiSuccess(res, 'Attendance report retrieved', summary);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Get all attendance (paginated) — admin/hr
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Attendance list
 */
router.get('/', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const Attendance = require('../../modules/attendance/attendance.model');
    const { getMonthDateRange } = require('../../utils/helper.util');
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year,  10) || new Date().getFullYear();
    const { startDate, endDate } = getMonthDateRange(month, year);

    const query = { date: { $gte: startDate, $lte: endDate } };
    if (req.query.employeeId) query.employeeId = req.query.employeeId;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('employeeId', 'firstName lastName employeeCode')
        .sort({ date: -1 })
        .skip(skip).limit(limit).lean(),
      Attendance.countDocuments(query),
    ]);
    return apiSuccess(res, 'Attendance retrieved', records, {
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

module.exports = router;
