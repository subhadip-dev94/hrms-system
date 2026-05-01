const express = require('express');
const router = express.Router();
const employeeService = require('../../modules/employee/employee.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { uploadProfilePhoto } = require('../../config/cloudinary');
const { apiSuccess, apiCreated, apiError, apiBadRequest, apiNotFound } = require('../../utils/response.util');
const { getPaginationParams } = require('../../utils/helper.util');

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee management
 */

// All routes require authentication
router.use(verifyApiToken);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get all employees (paginated)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, resigned, terminated] }
 *     responses:
 *       200:
 *         description: Paginated employees list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filters = {
      search: req.query.search || '',
      departmentId: req.query.departmentId || '',
      status: req.query.status || '',
    };
    const Employee = require('../../modules/employee/employee.model');
    const query = {};
    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [
        { firstName: regex }, { lastName: regex },
        { email: regex }, { employeeCode: regex }, { designation: regex },
      ];
    }
    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.status)       query.status       = filters.status;

    const [employees, total] = await Promise.all([
      Employee.find(query)
        .populate('departmentId', 'name code')
        .populate('managerId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Employee.countDocuments(query),
    ]);

    return apiSuccess(res, 'Employees retrieved', employees, {
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get single employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Employee detail
 *       404:
 *         description: Not found
 */
router.get('/:id', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);
    if (!employee) return apiNotFound(res, 'Employee not found');
    return apiSuccess(res, 'Employee retrieved', employee);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /employees/{id}/profile:
 *   get:
 *     summary: Get employee profile (own for employee role)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Employee profile
 *       403:
 *         description: Forbidden
 */
router.get('/:id/profile', async (req, res) => {
  try {
    const { role, employeeId } = req.apiUser;
    if (role === 'employee' && String(employeeId) !== String(req.params.id)) {
      return apiError(res, 403, 'You can only view your own profile', 'FORBIDDEN');
    }
    const employee = await employeeService.getEmployeeById(req.params.id);
    if (!employee) return apiNotFound(res, 'Employee not found');
    return apiSuccess(res, 'Profile retrieved', employee);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create new employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Employee created
 */
router.post('/', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const employee = await employeeService.createEmployee(req.body, null);
    return apiCreated(res, 'Employee created', employee);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update employee
 *     tags: [Employees]
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
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Employee updated
 */
router.put('/:id', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body, null);
    return apiSuccess(res, 'Employee updated', employee);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Soft delete employee (set status to terminated)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Employee deactivated
 */
router.delete('/:id', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const employee = await employeeService.softDeleteEmployee(req.params.id);
    return apiSuccess(res, 'Employee deactivated', employee);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /employees/{id}/photo:
 *   put:
 *     summary: Update employee profile photo
 *     tags: [Employees]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo updated
 */
router.put('/:id/photo', (req, res, next) => {
  const { role, employeeId } = req.apiUser;
  if (!['admin', 'hr'].includes(role) && String(employeeId) !== String(req.params.id)) {
    return apiError(res, 403, 'Forbidden', 'FORBIDDEN');
  }
  uploadProfilePhoto(req, res, async (err) => {
    if (err) return apiBadRequest(res, err.message);
    try {
      const employee = await employeeService.updateEmployee(req.params.id, {}, req.file);
      return apiSuccess(res, 'Photo updated', { profilePhoto: employee.profilePhoto });
    } catch (e) {
      return apiError(res, 400, e.message, 'BAD_REQUEST');
    }
  });
});

module.exports = router;
