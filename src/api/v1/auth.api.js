const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authService = require('../../modules/auth/auth.service');
const { verifyApiToken } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiError, apiBadRequest } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive JWT token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *       400:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return apiBadRequest(res, 'Email and password are required');

    const result = await authService.login(email.trim(), password);

    // Re-sign token with longer expiry for API use
    const token = jwt.sign(
      { id: result.user._id, role: result.user.role, email: result.user.email, employeeId: result.user.employeeId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return apiSuccess(res, 'Login successful', { token, user: result.user });
  } catch (err) {
    return apiError(res, 401, err.message, 'UNAUTHORIZED');
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout (token invalidation handled client-side)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', verifyApiToken, (req, res) => {
  return apiSuccess(res, 'Logged out successfully');
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *       401:
 *         description: Unauthorized
 */
router.get('/me', verifyApiToken, async (req, res) => {
  try {
    const User = require('../../modules/auth/user.model');
    const user = await User.findById(req.apiUser.id)
      .select('-password')
      .populate('employeeId', 'firstName lastName employeeCode profilePhoto designation departmentId')
      .lean();
    if (!user) return apiError(res, 404, 'User not found', 'NOT_FOUND');
    return apiSuccess(res, 'Profile retrieved', user);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

module.exports = router;
