const announcementService = require('./announcement.service');
const { validateAnnouncement } = require('../../utils/validation.util');

const ALL_ROLES = ['admin', 'hr', 'manager', 'employee', 'finance', 'all'];

const announcementController = {
  // GET /announcements
  async index(req, res) {
    try {
      const role = req.session.user.role;
      const isAdmin = ['admin', 'hr'].includes(role);
      const announcements = isAdmin
        ? await announcementService.getAllAnnouncements()
        : await announcementService.getAnnouncements(role);

      res.render('pages/announcement/index', {
        title: 'Announcements',
        announcements,
        isAdmin,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /announcements/create
  async createForm(req, res) {
    try {
      res.render('pages/announcement/create', {
        title: 'Create Announcement',
        roles: ALL_ROLES,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/announcements');
    }
  },

  // POST /announcements
  async create(req, res) {
    try {
      const validationErrors = validateAnnouncement(req.body);
      if (validationErrors.length > 0) {
        return res.render('pages/announcement/create', {
          title: 'Create Announcement',
          roles: ALL_ROLES,
          errors: validationErrors,
          old: req.body,
        });
      }
      await announcementService.createAnnouncement(req.body, req.session.user.employeeId);
      req.flash('success', 'Announcement created');
      res.redirect('/announcements');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/announcements/create');
    }
  },

  // POST /announcements/:id/pin
  async togglePin(req, res) {
    try {
      await announcementService.togglePin(req.params.id);
      res.redirect('/announcements');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/announcements');
    }
  },

  // DELETE /announcements/:id
  async remove(req, res) {
    try {
      await announcementService.deleteAnnouncement(req.params.id);
      req.flash('success', 'Announcement deleted');
      res.redirect('/announcements');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/announcements');
    }
  },

  // POST /announcements/:id/read
  async markRead(req, res) {
    try {
      await announcementService.markAsRead(req.params.id, req.session.user.employeeId);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, error: err.message });
    }
  },
};

module.exports = announcementController;
