const express = require('express');
const router = express.Router();
const holidayService = require('../../modules/holiday/holiday.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiCreated, apiError } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Holidays
 *   description: Holiday calendar management
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /holidays:
 *   get:
 *     summary: Get holidays for a given year
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Holidays list
 */
router.get('/', async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const holidays = await holidayService.getHolidaysByYear(year);
    return apiSuccess(res, 'Holidays retrieved', holidays);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /holidays:
 *   post:
 *     summary: Create holiday
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Holiday'
 *     responses:
 *       201:
 *         description: Holiday created
 */
router.post('/', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const holiday = await holidayService.createHoliday(req.body);
    return apiCreated(res, 'Holiday created', holiday);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /holidays/{id}:
 *   delete:
 *     summary: Delete holiday
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Holiday deleted
 */
router.delete('/:id', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    await holidayService.deleteHoliday(req.params.id);
    return apiSuccess(res, 'Holiday deleted');
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
