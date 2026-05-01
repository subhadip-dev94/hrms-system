const express = require('express');
const router = express.Router();
const performanceService = require('../../modules/performance/performance.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiCreated, apiError } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Performance
 *   description: KPI and performance review management
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /performance/reviews/my:
 *   get:
 *     summary: Get my performance reviews
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My reviews
 */
router.get('/reviews/my', async (req, res) => {
  try {
    const reviews = await performanceService.getMyReviews(req.apiUser.employeeId);
    return apiSuccess(res, 'Reviews retrieved', reviews);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /performance/team:
 *   get:
 *     summary: Get team performance overview
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team performance
 */
router.get('/team', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const data = await performanceService.getTeamPerformance(req.apiUser.employeeId, req.apiUser.role);
    return apiSuccess(res, 'Team performance retrieved', data);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /performance:
 *   get:
 *     summary: Get my KPIs
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPIs list
 */
router.get('/', async (req, res) => {
  try {
    const KPI = require('../../modules/performance/kpi.model');
    const kpis = await KPI.find({ employeeId: req.apiUser.employeeId })
      .sort({ createdAt: -1 }).lean();
    return apiSuccess(res, 'KPIs retrieved', kpis);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /performance:
 *   post:
 *     summary: Assign KPI to employee
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: KPI assigned
 */
router.post('/', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const kpi = await performanceService.assignKPI(req.body, req.apiUser.employeeId);
    return apiCreated(res, 'KPI assigned', kpi);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /performance/{id}:
 *   put:
 *     summary: Update KPI
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: KPI updated
 */
router.put('/:id', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const kpi = await performanceService.updateKPI(req.params.id, req.body);
    return apiSuccess(res, 'KPI updated', kpi);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /performance/{id}/progress:
 *   put:
 *     summary: Update KPI progress
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value: { type: number }
 *               note:  { type: string }
 *     responses:
 *       200:
 *         description: Progress updated
 */
router.put('/:id/progress', async (req, res) => {
  try {
    const kpi = await performanceService.updateProgress(req.params.id, req.apiUser.employeeId, req.body);
    return apiSuccess(res, 'Progress updated', kpi);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /performance/{id}:
 *   delete:
 *     summary: Cancel KPI
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: KPI cancelled
 */
router.delete('/:id', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    await performanceService.cancelKPI(req.params.id);
    return apiSuccess(res, 'KPI cancelled');
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /performance/review:
 *   post:
 *     summary: Submit performance review
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Review submitted
 */
router.post('/review', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const review = await performanceService.submitReview(req.body, req.apiUser.employeeId);
    return apiCreated(res, 'Review submitted', review);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /performance/review/{id}/acknowledge:
 *   put:
 *     summary: Acknowledge performance review
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review acknowledged
 */
router.put('/review/:id/acknowledge', async (req, res) => {
  try {
    const review = await performanceService.acknowledgeReview(req.params.id, req.apiUser.employeeId);
    return apiSuccess(res, 'Review acknowledged', review);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
