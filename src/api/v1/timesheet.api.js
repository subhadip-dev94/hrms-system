const express = require('express');
const router = express.Router();
const timesheetService = require('../../modules/timesheet/timesheet.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiCreated, apiError } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Timesheet
 *   description: Timesheet management
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /timesheet/report:
 *   get:
 *     summary: Timesheet report for managers
 *     tags: [Timesheet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: projectName
 *         schema: { type: string }
 *       - in: query
 *         name: workType
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Timesheet report
 */
router.get('/report', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const report = await timesheetService.getTeamReport(req.query);
    return apiSuccess(res, 'Timesheet report retrieved', report);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /timesheet:
 *   get:
 *     summary: Get timesheet entries
 *     tags: [Timesheet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekStart
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Timesheet entries
 */
router.get('/', async (req, res) => {
  try {
    const { role, employeeId } = req.apiUser;
    const filters = { ...req.query };
    if (!['admin', 'hr', 'manager'].includes(role)) {
      filters.employeeId = employeeId;
    }
    const entries = await timesheetService.getTimesheetEntries(filters);
    return apiSuccess(res, 'Timesheet entries retrieved', entries);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /timesheet:
 *   post:
 *     summary: Log work hours
 *     tags: [Timesheet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Timesheet'
 *     responses:
 *       201:
 *         description: Entry created
 */
router.post('/', async (req, res) => {
  try {
    const entry = await timesheetService.logWork(req.apiUser.employeeId, req.body);
    return apiCreated(res, 'Work logged', entry);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /timesheet/{id}:
 *   put:
 *     summary: Update timesheet entry
 *     tags: [Timesheet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Entry updated
 */
router.put('/:id', async (req, res) => {
  try {
    const entry = await timesheetService.updateEntry(req.params.id, req.apiUser.employeeId, req.body);
    return apiSuccess(res, 'Entry updated', entry);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /timesheet/{id}:
 *   delete:
 *     summary: Delete draft timesheet entry
 *     tags: [Timesheet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Entry deleted
 */
router.delete('/:id', async (req, res) => {
  try {
    await timesheetService.deleteEntry(req.params.id, req.apiUser.employeeId);
    return apiSuccess(res, 'Entry deleted');
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /timesheet/{id}/submit:
 *   put:
 *     summary: Submit timesheet entry
 *     tags: [Timesheet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Entry submitted
 */
router.put('/:id/submit', async (req, res) => {
  try {
    const entry = await timesheetService.submitEntry(req.params.id, req.apiUser.employeeId);
    return apiSuccess(res, 'Entry submitted', entry);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /timesheet/{id}/approve:
 *   put:
 *     summary: Approve timesheet entry
 *     tags: [Timesheet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Entry approved
 */
router.put('/:id/approve', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const entry = await timesheetService.approveEntry(req.params.id, req.apiUser.employeeId);
    return apiSuccess(res, 'Entry approved', entry);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /timesheet/{id}/reject:
 *   put:
 *     summary: Reject timesheet entry
 *     tags: [Timesheet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Entry rejected
 */
router.put('/:id/reject', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const entry = await timesheetService.rejectEntry(req.params.id, req.apiUser.employeeId, req.body.comment);
    return apiSuccess(res, 'Entry rejected', entry);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
