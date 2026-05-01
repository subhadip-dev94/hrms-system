const mongoose = require('mongoose');
const Announcement = require('./announcement.model');
const errors = require('../../utils/errorCodes.util');

// Reusable helper to build a filter that matches both role visibility and expiry
function buildVisibilityFilter(role, now) {
  return {
    isActive: true,
    $and: [
      { $or: [{ targetRoles: 'all' }, { targetRoles: role }] },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  };
}

const announcementService = {
  // ─── Get announcements visible to a role ──────────────────────────────────
  async getAnnouncements(role) {
    const now = new Date();
    return await Announcement.find(buildVisibilityFilter(role, now))
      .populate('createdBy', 'firstName lastName')
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();
  },

  // ─── Get all announcements (admin/hr view) ────────────────────────────────
  async getAllAnnouncements() {
    return await Announcement.find({ isActive: true })
      .populate('createdBy', 'firstName lastName')
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();
  },

  // ─── Get single announcement ──────────────────────────────────────────────
  async getAnnouncementById(id) {
    const announcement = await Announcement.findOne({ _id: id, isActive: true })
      .populate('createdBy', 'firstName lastName')
      .lean();
    if (!announcement) throw new Error(errors.ANNOUNCEMENT_NOT_FOUND);
    return announcement;
  },

  // ─── Create announcement ──────────────────────────────────────────────────
  async createAnnouncement(data, createdBy) {
    let targetRoles = data.targetRoles;
    if (!Array.isArray(targetRoles)) {
      targetRoles = targetRoles ? [targetRoles] : ['all'];
    }

    const announcement = await Announcement.create({
      title: data.title.trim(),
      body: data.body.trim(),
      targetRoles,
      isPinned: data.isPinned === 'true' || data.isPinned === true,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      createdBy,
    });

    // Real-time: push to targeted roles so their navbar badge increments live
    try {
      const { emitToRoles, emitToAll } = require('../../config/socket');
      const payload = { id: announcement._id, title: announcement.title };
      if (targetRoles.includes('all')) {
        emitToAll('announcement:new', payload);
      } else {
        emitToRoles(targetRoles, 'announcement:new', payload);
      }
    } catch (_) {}

    return announcement;
  },

  // ─── Update announcement ──────────────────────────────────────────────────
  async updateAnnouncement(id, data) {
    let targetRoles = data.targetRoles;
    if (!Array.isArray(targetRoles)) {
      targetRoles = targetRoles ? [targetRoles] : ['all'];
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      {
        title: data.title.trim(),
        body: data.body.trim(),
        targetRoles,
        isPinned: data.isPinned === 'true' || data.isPinned === true,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      { new: true }
    );
    if (!announcement) throw new Error(errors.ANNOUNCEMENT_NOT_FOUND);
    return announcement;
  },

  // ─── Toggle pin ───────────────────────────────────────────────────────────
  async togglePin(id) {
    const announcement = await Announcement.findById(id);
    if (!announcement) throw new Error(errors.ANNOUNCEMENT_NOT_FOUND);
    announcement.isPinned = !announcement.isPinned;
    return await announcement.save();
  },

  // ─── Soft delete ──────────────────────────────────────────────────────────
  async deleteAnnouncement(id) {
    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!announcement) throw new Error(errors.ANNOUNCEMENT_NOT_FOUND);
  },

  // ─── Mark as read by a user ───────────────────────────────────────────────
  async markAsRead(id, employeeId) {
    await Announcement.findByIdAndUpdate(id, {
      $addToSet: { readBy: employeeId },
    });
  },

  // ─── Get unread count for a user/role ─────────────────────────────────────
  async getUnreadCount(employeeId, role) {
    const now = new Date();
    return await Announcement.countDocuments({
      ...buildVisibilityFilter(role, now),
      readBy: { $ne: employeeId },
    });
  },

  // ─── Get latest N announcements for navbar dropdown ──────────────────────
  // Was: find() + JS .some() per doc to check readBy array (O(n) per doc)
  // Now: aggregation $in expression — server-side, readBy array not transferred
  async getLatestForNavbar(employeeId, role, limit = 5) {
    const now    = new Date();
    const empOid = new mongoose.Types.ObjectId(String(employeeId));

    return Announcement.aggregate([
      { $match: buildVisibilityFilter(role, now) },
      { $sort:  { isPinned: -1, createdAt: -1 } },
      { $limit: limit },
      { $addFields: { isRead: { $in: [empOid, '$readBy'] } } },
      { $project:   { readBy: 0 } },
    ]);
  },
};

module.exports = announcementService;
