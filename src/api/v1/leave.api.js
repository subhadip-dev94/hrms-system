const express = require('express');
const router = express.Router();
const leaveService = require('../../modules/leave/leave.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiCreated, apiError } = require('../../utils/response.util');
const { getPaginationParams } = require('../../utils/helper.util');

/**
 * @swagger
 * tags:
 *   name: Leaves
 *   description: Leave management
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /leaves/my:
 *   get:
 *     summary: Get my leave history
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My leaves
 */
router.get('/my', async (req, res) => {
  try {
    const leaves = await leaveService.getEmployeeLeaves(req.apiUser.employeeId);
    return apiSuccess(res, 'My leaves retrieved', leaves);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /leaves/balance:
 *   get:
 *     summary: Get my leave balance
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leave balance
 */
router.get('/balance', async (req, res) => {
  try {
    const balance = await leaveService.getLeaveBalance(req.apiUser.employeeId);
    return apiSuccess(res, 'Leave balance retrieved', balance);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /leaves/approvals:
 *   get:
 *     summary: Get pending leave approvals queue
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending approvals
 */
router.get('/approvals', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const queue = await leaveService.getPendingApprovals(req.apiUser.employeeId, req.apiUser.role);
    return apiSuccess(res, 'Pending approvals retrieved', queue);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /leaves:
 *   get:
 *     summary: Get all leaves (admin/hr)
 *     tags: [Leaves]
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
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected, cancelled] }
 *       - in: query
 *         name: leaveType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated leave list
 */
router.get('/', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const Leave = require('../../modules/leave/leave.model');
    const query = {};
    if (req.query.employeeId) query.employeeId = req.query.employeeId;
    if (req.query.status)     query.status     = req.query.status;
    if (req.query.leaveType)  query.leaveType  = req.query.leaveType;

    const [leaves, total] = await Promise.all([
      Leave.find(query)
        .populate('employeeId', 'firstName lastName employeeCode')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      Leave.countDocuments(query),
    ]);
    return apiSuccess(res, 'Leaves retrieved', leaves, {
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /leaves:
 *   post:
 *     summary: Apply for leave
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leaveType, startDate, endDate, reason]
 *             properties:
 *               leaveType: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate:   { type: string, format: date }
 *               reason:    { type: string }
 *     responses:
 *       201:
 *         description: Leave application submitted
 */
router.post('/', async (req, res) => {
  try {
    const leave = await leaveService.applyLeave(req.apiUser.employeeId, req.body);
    return apiCreated(res, 'Leave application submitted', leave);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /leaves/{id}/approve:
 *   put:
 *     summary: Approve leave
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave approved
 */
router.put('/:id/approve', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const leave = await leaveService.approveLeave(req.params.id, req.apiUser.employeeId, req.body.comment);
    return apiSuccess(res, 'Leave approved', leave);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /leaves/{id}/reject:
 *   put:
 *     summary: Reject leave
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave rejected
 */
router.put('/:id/reject', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const leave = await leaveService.rejectLeave(req.params.id, req.apiUser.employeeId, req.body.comment);
    return apiSuccess(res, 'Leave rejected', leave);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /leaves/{id}/cancel:
 *   put:
 *     summary: Cancel leave
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave cancelled
 */
router.put('/:id/cancel', async (req, res) => {
  try {
    const leave = await leaveService.cancelLeave(req.params.id, req.apiUser.employeeId);
    return apiSuccess(res, 'Leave cancelled', leave);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
