const express = require('express');
const router = express.Router();
const recruitmentService = require('../../modules/recruitment/recruitment.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { uploadResume } = require('../../config/cloudinary');
const { apiSuccess, apiCreated, apiError, apiBadRequest } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Recruitment
 *   description: Job postings and candidate management
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /recruitment:
 *   get:
 *     summary: Get all job postings
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, closed, on-hold] }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Job postings list
 */
router.get('/', async (req, res) => {
  try {
    const jobs = await recruitmentService.getAllJobs({
      status: req.query.status || '',
      departmentId: req.query.departmentId || '',
    });
    return apiSuccess(res, 'Jobs retrieved', jobs);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /recruitment/candidate/{id}:
 *   get:
 *     summary: Get candidate detail
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Candidate detail
 */
router.get('/candidate/:id', apiAuthorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const candidate = await recruitmentService.getCandidateById(req.params.id);
    return apiSuccess(res, 'Candidate retrieved', candidate);
  } catch (err) {
    return apiError(res, 404, err.message, 'NOT_FOUND');
  }
});

/**
 * @swagger
 * /recruitment:
 *   post:
 *     summary: Create job posting
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Job created
 */
router.post('/', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const job = await recruitmentService.createJob(req.body, req.apiUser.employeeId);
    return apiCreated(res, 'Job posting created', job);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /recruitment/{id}:
 *   put:
 *     summary: Update job posting
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Job updated
 */
router.put('/:id', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const job = await recruitmentService.updateJob(req.params.id, req.body);
    return apiSuccess(res, 'Job updated', job);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /recruitment/{id}/status:
 *   put:
 *     summary: Update job status
 *     tags: [Recruitment]
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
 *               status: { type: string, enum: [open, closed, on-hold] }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const job = await recruitmentService.updateJobStatus(req.params.id, req.body.status);
    return apiSuccess(res, 'Job status updated', job);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /recruitment/{id}/candidate:
 *   post:
 *     summary: Add candidate to job
 *     tags: [Recruitment]
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
 *               resume:
 *                 type: string
 *                 format: binary
 *               name:  { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: Candidate added
 */
router.post('/:id/candidate', apiAuthorize('admin', 'hr'), (req, res) => {
  uploadResume(req, res, async (err) => {
    if (err) return apiBadRequest(res, err.message);
    try {
      const candidate = await recruitmentService.addCandidate(req.params.id, req.body, req.file);
      return apiCreated(res, 'Candidate added', candidate);
    } catch (e) {
      return apiError(res, 400, e.message, 'BAD_REQUEST');
    }
  });
});

/**
 * @swagger
 * /recruitment/candidate/{id}/stage:
 *   put:
 *     summary: Update candidate stage
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Stage updated
 */
router.put('/candidate/:id/stage', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const candidate = await recruitmentService.updateCandidateStage(req.params.id, req.body);
    return apiSuccess(res, 'Stage updated', candidate);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /recruitment/candidate/{id}/interview:
 *   post:
 *     summary: Schedule interview
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Interview scheduled
 */
router.post('/candidate/:id/interview', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const candidate = await recruitmentService.scheduleInterview(req.params.id, req.body);
    return apiCreated(res, 'Interview scheduled', candidate);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /recruitment/candidate/{id}/offer:
 *   put:
 *     summary: Send offer to candidate
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Offer sent
 */
router.put('/candidate/:id/offer', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const candidate = await recruitmentService.sendOffer(req.params.id, req.body);
    return apiSuccess(res, 'Offer sent', candidate);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /recruitment/candidate/{id}/convert:
 *   post:
 *     summary: Convert candidate to employee
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Employee created from candidate
 */
router.post('/candidate/:id/convert', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const employee = await recruitmentService.convertToEmployee(req.params.id, req.body);
    return apiCreated(res, 'Candidate converted to employee', employee);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
