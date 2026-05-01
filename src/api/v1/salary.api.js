const express = require('express');
const router = express.Router();
const salaryService = require('../../modules/salary/salary.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiCreated, apiError } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Salary
 *   description: Salary structure management
 */

router.use(verifyApiToken);
router.use(apiAuthorize('admin', 'hr', 'finance'));

/**
 * @swagger
 * /salary:
 *   get:
 *     summary: Get all employee salary structures
 *     tags: [Salary]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Salary list
 */
router.get('/', async (req, res) => {
  try {
    const salaries = await salaryService.getAllSalaries();
    return apiSuccess(res, 'Salaries retrieved', salaries);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /salary/{employeeId}:
 *   get:
 *     summary: Get salary for a specific employee
 *     tags: [Salary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Employee salary
 */
router.get('/:employeeId', async (req, res) => {
  try {
    const salary = await salaryService.getEmployeeSalary(req.params.employeeId);
    return apiSuccess(res, 'Salary retrieved', salary);
  } catch (err) {
    return apiError(res, 404, err.message, 'NOT_FOUND');
  }
});

/**
 * @swagger
 * /salary/assign:
 *   post:
 *     summary: Assign salary structure
 *     tags: [Salary]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Salary assigned
 */
router.post('/assign', async (req, res) => {
  try {
    const salary = await salaryService.assignSalary(req.body);
    return apiCreated(res, 'Salary assigned', salary);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /salary/{employeeId}:
 *   put:
 *     summary: Revise salary
 *     tags: [Salary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Salary revised
 */
router.put('/:employeeId', async (req, res) => {
  try {
    const salary = await salaryService.reviseSalary(req.params.employeeId, req.body);
    return apiSuccess(res, 'Salary revised', salary);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
