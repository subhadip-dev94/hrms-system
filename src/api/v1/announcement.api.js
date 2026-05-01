const express = require('express');
const router = express.Router();
const announcementService = require('../../modules/announcement/announcement.service');
const { verifyApiToken, apiAuthorize } = require('../../middlewares/apiAuth.middleware');
const { apiSuccess, apiCreated, apiError } = require('../../utils/response.util');

/**
 * @swagger
 * tags:
 *   name: Announcements
 *   description: Company announcements
 */

router.use(verifyApiToken);

/**
 * @swagger
 * /announcements/unread-count:
 *   get:
 *     summary: Get unread announcement count
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', async (req, res) => {
  try {
    const count = await announcementService.getUnreadCount(req.apiUser.employeeId, req.apiUser.role);
    return apiSuccess(res, 'Unread count', { count });
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /announcements:
 *   get:
 *     summary: Get active announcements for the current user's role
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Announcements list
 */
router.get('/', async (req, res) => {
  try {
    const announcements = await announcementService.getAnnouncements(
      req.apiUser.employeeId,
      req.apiUser.role
    );
    return apiSuccess(res, 'Announcements retrieved', announcements);
  } catch (err) {
    return apiError(res, 500, err.message, 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /announcements:
 *   post:
 *     summary: Create announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Announcement created
 */
router.post('/', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const announcement = await announcementService.createAnnouncement(req.body, req.apiUser.employeeId);
    return apiCreated(res, 'Announcement created', announcement);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /announcements/{id}/pin:
 *   put:
 *     summary: Toggle pin status
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Pin status toggled
 */
router.put('/:id/pin', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    const ann = await announcementService.togglePin(req.params.id);
    return apiSuccess(res, 'Pin status updated', ann);
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /announcements/{id}/read:
 *   put:
 *     summary: Mark announcement as read
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    await announcementService.markRead(req.params.id, req.apiUser.employeeId);
    return apiSuccess(res, 'Marked as read');
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

/**
 * @swagger
 * /announcements/{id}:
 *   delete:
 *     summary: Soft delete announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Announcement deleted
 */
router.delete('/:id', apiAuthorize('admin', 'hr'), async (req, res) => {
  try {
    await announcementService.deleteAnnouncement(req.params.id);
    return apiSuccess(res, 'Announcement deleted');
  } catch (err) {
    return apiError(res, 400, err.message, 'BAD_REQUEST');
  }
});

module.exports = router;
