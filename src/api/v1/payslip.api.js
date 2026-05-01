const express = require('express');
const router = express.Router();
const payslipService = require('../../modules/payslip/payslip.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiError } = require('../../utils/response.util');
const { getPaginationParams } = require('../../utils/helper.util');

/**
 * @swagger
 * tags:
 *   name: Payslip
 *   description: Payslip retrieval
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /payslip:
 *   get:
 *     summary: Get payslips (own for employee, all for hr/admin/finance)
 *     tags: [Payslip]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payslip list
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const Payslip = require('../../modules/payslip/payslip.model');
    const query = {};
    if (!['admin', 'hr', 'finance'].includes(req.apiUser.role)) {
      query.employeeId = req.apiUser.employeeId;
    } else {
      if (req.query.employeeId) query.employeeId = req.query.employeeId;
    }
    const [payslips, total] = await Promise.all([
      Payslip.find(query)
        .populate('employeeId', 'firstName lastName employeeCode')
        .sort({ year: -1, month: -1 })
        .skip(skip).limit(limit).lean(),
      Payslip.countDocuments(query),
    ]);
    return apiSuccess(res, 'Payslips retrieved', payslips, {
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /payslip/{id}:
 *   get:
 *     summary: Get single payslip
 *     tags: [Payslip]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payslip detail
 */
router.get('/:id', async (req, res) => {
  try {
    const Payslip = require('../../modules/payslip/payslip.model');
    const payslip = await Payslip.findById(req.params.id)
      .populate('employeeId', 'firstName lastName employeeCode designation departmentId')
      .populate('payrollId')
      .lean();
    if (!payslip) return apiError(res, 404, 'Payslip not found', 'NOT_FOUND');

    if (!['admin', 'hr', 'finance'].includes(req.apiUser.role)) {
      if (String(payslip.employeeId._id) !== String(req.apiUser.employeeId)) {
        return apiError(res, 403, 'Forbidden', 'FORBIDDEN');
      }
    }
    return apiSuccess(res, 'Payslip retrieved', payslip);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /payslip/{id}/download:
 *   get:
 *     summary: Download payslip PDF
 *     tags: [Payslip]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF file
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { filePath, filename } = await payslipService.getPayslipPDF(req.params.id, req.apiUser);
    res.download(filePath, filename);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /payslip/{id}/email:
 *   post:
 *     summary: Email payslip to employee
 *     tags: [Payslip]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email sent
 */
router.post('/:id/email', apiAuthorize('admin', 'hr', 'finance'), async (req, res) => {
  try {
    await payslipService.emailPayslip(req.params.id);
    return apiSuccess(res, 'Payslip email sent');
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
