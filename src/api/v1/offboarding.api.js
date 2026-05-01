const express = require('express');
const router = express.Router();
const offboardingService = require('../../modules/offboarding/offboarding.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiCreated, apiError } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Offboarding
 *   description: Employee offboarding management
 */

router.use(verifyApiToken);
router.use(apiAuthorize('admin', 'hr'));

/**
 * @swagger
 * /offboarding:
 *   get:
 *     summary: Get all offboarding cases
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: exitType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Offboarding cases list
 */
router.get('/', async (req, res) => {
  try {
    const offboardings = await offboardingService.getAllOffboarding({
      status: req.query.status || '',
      exitType: req.query.exitType || '',
    });
    return apiSuccess(res, 'Offboarding cases retrieved', offboardings);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /offboarding:
 *   post:
 *     summary: Initiate offboarding
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Offboarding initiated
 */
router.post('/', async (req, res) => {
  try {
    const offboarding = await offboardingService.initiateOffboarding(req.body, req.apiUser.employeeId);
    return apiCreated(res, 'Offboarding initiated', offboarding);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /offboarding/{id}:
 *   get:
 *     summary: Get offboarding detail
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Offboarding detail
 */
router.get('/:id', async (req, res) => {
  try {
    const offboarding = await offboardingService.getOffboardingById(req.params.id);
    return apiSuccess(res, 'Offboarding retrieved', offboarding);
  } catch (err) {
    return apiError(res, 404, err.message, 'NOT_FOUND');
  }
});

/**
 * @swagger
 * /offboarding/{id}/checklist/{itemIndex}:
 *   put:
 *     summary: Mark checklist item complete
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemIndex
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Checklist item updated
 */
router.put('/:id/checklist/:itemIndex', async (req, res) => {
  try {
    const offboarding = await offboardingService.markChecklistItem(
      req.params.id,
      parseInt(req.params.itemIndex, 10),
      req.apiUser.employeeId,
      req.body.notes
    );
    return apiSuccess(res, 'Checklist item updated', offboarding);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /offboarding/{id}/interview:
 *   put:
 *     summary: Save exit interview details
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Exit interview saved
 */
router.put('/:id/interview', async (req, res) => {
  try {
    const offboarding = await offboardingService.saveExitInterview(req.params.id, req.body);
    return apiSuccess(res, 'Exit interview saved', offboarding);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /offboarding/{id}/settlement:
 *   put:
 *     summary: Save final settlement details
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Settlement saved
 */
router.put('/:id/settlement', async (req, res) => {
  try {
    const offboarding = await offboardingService.saveFinalSettlement(req.params.id, req.body);
    return apiSuccess(res, 'Final settlement saved', offboarding);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /offboarding/{id}/complete:
 *   put:
 *     summary: Complete offboarding
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Offboarding completed
 */
router.put('/:id/complete', async (req, res) => {
  try {
    const offboarding = await offboardingService.completeOffboarding(req.params.id);
    return apiSuccess(res, 'Offboarding completed', offboarding);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /offboarding/{id}/cancel:
 *   put:
 *     summary: Cancel offboarding
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Offboarding cancelled
 */
router.put('/:id/cancel', async (req, res) => {
  try {
    const offboarding = await offboardingService.cancelOffboarding(req.params.id);
    return apiSuccess(res, 'Offboarding cancelled', offboarding);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
