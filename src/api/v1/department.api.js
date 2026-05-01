const express = require('express');
const router = express.Router();
const departmentService = require('../../modules/department/department.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiCreated, apiError, apiNotFound } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departments list
 */
router.get('/', async (req, res) => {
  try {
    const departments = await departmentService.getAllDepartments();
    return apiSuccess(res, 'Departments retrieved', departments);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     summary: Get single department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Department detail
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req, res) => {
  try {
    const dept = await departmentService.getDepartmentById(req.params.id);
    if (!dept) return apiNotFound(res, 'Department not found');
    return apiSuccess(res, 'Department retrieved', dept);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /departments:
 *   post:
 *     summary: Create department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Department'
 *     responses:
 *       201:
 *         description: Department created
 */
router.post('/', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const dept = await departmentService.createDepartment(req.body);
    return apiCreated(res, 'Department created', dept);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     summary: Update department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Department updated
 */
router.put('/:id', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const dept = await departmentService.updateDepartment(req.params.id, req.body);
    return apiSuccess(res, 'Department updated', dept);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     summary: Delete department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Department deleted
 */
router.delete('/:id', apiAuthorize('admin'), async (req, res) => {
  try {
    await departmentService.deleteDepartment(req.params.id);
    return apiSuccess(res, 'Department deleted');
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
