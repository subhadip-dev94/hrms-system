const express = require('express');
const router = express.Router();
const payrollService = require('../../modules/payroll/payroll.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiCreated, apiError } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Payroll
 *   description: Payroll processing
 */

router.use(verifyApiToken);
router.use(apiAuthorize('admin', 'hr', 'finance'));

/**
 * @swagger
 * /payroll:
 *   get:
 *     summary: Get all payroll runs
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payroll list
 */
router.get('/', async (req, res) => {
  try {
    const payrolls = await payrollService.getAllPayrolls();
    return apiSuccess(res, 'Payrolls retrieved', payrolls);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /payroll/run:
 *   post:
 *     summary: Run payroll for a month
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [month, year]
 *             properties:
 *               month: { type: integer }
 *               year:  { type: integer }
 *     responses:
 *       201:
 *         description: Payroll run complete
 */
router.post('/run', async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return apiError(res, 400, 'month and year are required', 'BAD_REQUEST');
    const payroll = await payrollService.runPayroll(
      parseInt(month, 10),
      parseInt(year, 10),
      req.apiUser.employeeId
    );
    return apiCreated(res, 'Payroll processed', payroll);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /payroll/{id}:
 *   get:
 *     summary: Get payroll detail
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payroll detail
 */
router.get('/:id', async (req, res) => {
  try {
    const payroll = await payrollService.getPayrollById(req.params.id);
    if (!payroll) return apiError(res, 404, 'Payroll not found', 'NOT_FOUND');
    return apiSuccess(res, 'Payroll retrieved', payroll);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /payroll/{id}/markpaid:
 *   put:
 *     summary: Mark payroll as paid
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Marked as paid
 */
router.put('/:id/markpaid', apiAuthorize('admin', 'finance'), async (req, res) => {
  try {
    const payroll = await payrollService.markAsPaid(req.params.id);
    return apiSuccess(res, 'Payroll marked as paid', payroll);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
