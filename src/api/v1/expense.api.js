const express = require('express');
const router = express.Router();
const expenseService = require('../../modules/expense/expense.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { uploadReceipt } = require('../../config/cloudinary');
const { apiSuccess, apiCreated, apiError, apiBadRequest } = require('../../utils/response.util');
const { getPaginationParams } = require('../../utils/helper.util');

/**
 * @swagger
 * tags:
 *   name: Expense
 *   description: Expense claims management
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /expense/approvals:
 *   get:
 *     summary: Get pending expense approvals
 *     tags: [Expense]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending approvals queue
 */
router.get('/approvals', apiAuthorize('admin', 'hr', 'finance', 'manager'), async (req, res) => {
  try {
    const approvals = await expenseService.getPendingApprovals(req.apiUser.employeeId, req.apiUser.role);
    return apiSuccess(res, 'Pending approvals retrieved', approvals);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /expense:
 *   get:
 *     summary: Get expenses (own for employee, all for hr/finance/admin)
 *     tags: [Expense]
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
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expenses list
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const Expense = require('../../modules/expense/expense.model');
    const query = {};
    if (!['admin', 'hr', 'finance'].includes(req.apiUser.role)) {
      query.employeeId = req.apiUser.employeeId;
    }
    if (req.query.status)   query.status   = req.query.status;
    if (req.query.category) query.category = req.query.category;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('employeeId', 'firstName lastName employeeCode')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      Expense.countDocuments(query),
    ]);
    return apiSuccess(res, 'Expenses retrieved', expenses, {
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /expense:
 *   post:
 *     summary: Submit expense claim
 *     tags: [Expense]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *               title:       { type: string }
 *               amount:      { type: number }
 *               category:    { type: string }
 *               expenseDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Expense created
 */
router.post('/', (req, res) => {
  uploadReceipt(req, res, async (err) => {
    if (err) return apiBadRequest(res, err.message);
    try {
      const expense = await expenseService.createExpense(req.apiUser.employeeId, req.body, req.file);
      return apiCreated(res, 'Expense created', expense);
    } catch (e) {
      return apiError(res, 400, e.message, 'BAD_REQUEST');
    }
  });
});

/**
 * @swagger
 * /expense/{id}:
 *   put:
 *     summary: Update draft expense
 *     tags: [Expense]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense updated
 */
router.put('/:id', (req, res) => {
  uploadReceipt(req, res, async (err) => {
    if (err) return apiBadRequest(res, err.message);
    try {
      const expense = await expenseService.updateExpense(req.params.id, req.apiUser.employeeId, req.body, req.file);
      return apiSuccess(res, 'Expense updated', expense);
    } catch (e) {
      return apiError(res, 400, e.message, 'BAD_REQUEST');
    }
  });
});

/**
 * @swagger
 * /expense/{id}:
 *   delete:
 *     summary: Delete draft expense
 *     tags: [Expense]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense deleted
 */
router.delete('/:id', async (req, res) => {
  try {
    await expenseService.deleteExpense(req.params.id, req.apiUser.employeeId);
    return apiSuccess(res, 'Expense deleted');
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /expense/{id}/submit:
 *   put:
 *     summary: Submit expense for approval
 *     tags: [Expense]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense submitted
 */
router.put('/:id/submit', async (req, res) => {
  try {
    const expense = await expenseService.submitExpense(req.params.id, req.apiUser.employeeId);
    return apiSuccess(res, 'Expense submitted', expense);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /expense/{id}/approve:
 *   put:
 *     summary: Approve expense
 *     tags: [Expense]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense approved
 */
router.put('/:id/approve', apiAuthorize('admin', 'hr', 'finance', 'manager'), async (req, res) => {
  try {
    const expense = await expenseService.approveExpense(req.params.id, req.apiUser.employeeId, req.body.comment);
    return apiSuccess(res, 'Expense approved', expense);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /expense/{id}/reject:
 *   put:
 *     summary: Reject expense
 *     tags: [Expense]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense rejected
 */
router.put('/:id/reject', apiAuthorize('admin', 'hr', 'finance', 'manager'), async (req, res) => {
  try {
    const expense = await expenseService.rejectExpense(req.params.id, req.apiUser.employeeId, req.body.comment);
    return apiSuccess(res, 'Expense rejected', expense);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /expense/{id}/markpaid:
 *   put:
 *     summary: Mark expense as paid
 *     tags: [Expense]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense marked as paid
 */
router.put('/:id/markpaid', apiAuthorize('admin', 'finance'), async (req, res) => {
  try {
    const expense = await expenseService.markPaid(req.params.id, req.body.paymentMode);
    return apiSuccess(res, 'Expense marked as paid', expense);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
