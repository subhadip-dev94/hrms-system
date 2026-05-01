const express = require('express');
const router = express.Router();
const documentService = require('../../modules/document/document.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { uploadDocument } = require('../../config/cloudinary');
const { apiSuccess, apiCreated, apiError, apiBadRequest } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Employee document management
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /documents/my:
 *   get:
 *     summary: Get my documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My documents grouped by type
 */
router.get('/my', async (req, res) => {
  try {
    const grouped = await documentService.getMyDocuments(req.apiUser.employeeId);
    return apiSuccess(res, 'My documents retrieved', grouped);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     summary: Upload document for an employee
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *               employeeId:   { type: string }
 *               documentType: { type: string }
 *               title:        { type: string }
 *     responses:
 *       201:
 *         description: Document uploaded
 */
router.post('/upload', apiAuthorize('admin', 'hr'), (req, res) => {
  uploadDocument(req, res, async (err) => {
    if (err) return apiBadRequest(res, err.message);
    try {
      const doc = await documentService.uploadDocument(req.body, req.file, req.apiUser.employeeId);
      return apiCreated(res, 'Document uploaded', doc);
    } catch (e) {
      return apiError(res, 400, e.message, 'BAD_REQUEST');
    }
  });
});

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Get all documents (admin/hr)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: documentType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Documents list
 */
router.get('/', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const docs = await documentService.getAllDocuments({
      employeeId: req.query.employeeId || '',
      documentType: req.query.documentType || '',
    });
    return apiSuccess(res, 'Documents retrieved', docs);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /documents/{id}/download:
 *   get:
 *     summary: Get document download URL
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document URL
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { fileUrl, filename } = await documentService.downloadDocument(req.params.id, req.apiUser);
    return apiSuccess(res, 'Document URL', { fileUrl, filename });
  } catch (err) {
    return apiError(res, 403, err.message, 'FORBIDDEN');
  }
});

/**
 * @swagger
 * /documents/{id}/visibility:
 *   put:
 *     summary: Toggle document visibility
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Visibility toggled
 */
router.put('/:id/visibility', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const doc = await documentService.toggleVisibility(req.params.id);
    return apiSuccess(res, 'Visibility updated', doc);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Delete document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document deleted
 */
router.delete('/:id', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    await documentService.deleteDocument(req.params.id);
    return apiSuccess(res, 'Document deleted');
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
