const authService = require('./auth.service');

const authController = {

  getLogin(req, res) {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('pages/auth/login', { layout: false, title: 'Login – HRMS' });
  },

  async postLogin(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        req.flash('error', 'Email and password are required.');
        return res.redirect('/auth/login');
      }
      const { token, user } = await authService.login(email, password);
      req.session.user = user;
      req.session.token = token;
      req.flash('success', `Welcome back, ${user.name}!`);
      res.redirect('/dashboard');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/auth/login');
    }
  },

  // ─── Change own password (all users) ─────────────────────────────────────────
  getChangePassword(req, res) {
    res.render('pages/auth/change-password', { title: 'Change Password' });
  },

  async postChangePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (newPassword !== confirmPassword) {
        req.flash('error', 'New passwords do not match');
        return res.redirect('/auth/change-password');
      }
      await authService.changeOwnPassword(req.session.user._id, currentPassword, newPassword);
      req.flash('success', 'Password changed successfully. A confirmation email has been sent.');
      res.redirect('/auth/change-password');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/auth/change-password');
    }
  },

  // ─── Admin / HR: list users for password management ───────────────────────────
  async getManagePasswords(req, res) {
    try {
      const requesterRole = req.session.user.role;
      const users = await authService.getUsersForPasswordManagement(requesterRole);
      const pageTitle = requesterRole === 'hr' ? 'Employee Passwords' : 'Manage User Passwords';
      res.render('pages/auth/manage-passwords', { title: pageTitle, users, requesterRole });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // ─── Admin / HR: reset a specific user's password ─────────────────────────────
  async postResetUserPassword(req, res) {
    try {
      const { newPassword, confirmPassword } = req.body;
      if (newPassword !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/auth/manage-passwords');
      }
      await authService.resetUserPassword(req.params.userId, newPassword, req.session.user.role);
      req.flash('success', 'Password reset successfully. The user has been notified by email.');
      res.redirect('/auth/manage-passwords');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/auth/manage-passwords');
    }
  },

  // ─── My Profile ───────────────────────────────────────────────────────────────
  async getProfile(req, res) {
    try {
      const employee = await authService.getProfile(req.session.user.employeeId);
      if (!employee) {
        req.flash('error', 'Profile not found');
        return res.redirect('/dashboard');
      }
      res.render('pages/auth/profile', { title: 'My Profile', employee });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  async postUpdateProfile(req, res) {
    try {
      const data = {
        phone:         req.body.phone,
        address:       req.body.address,
        bankName:      req.body.bankName,
        accountNumber: req.body.accountNumber,
        ifscCode:      req.body.ifscCode,
      };

      // If a new photo was uploaded via multer/Cloudinary, req.file.path is the URL
      if (req.file && req.file.path) {
        data.profilePhoto = req.file.path;
      }

      const updated = await authService.updateProfile(req.session.user.employeeId, data);

      // Sync profile photo into session so navbar avatar updates immediately
      if (updated && updated.profilePhoto) {
        req.session.user.profilePhoto = updated.profilePhoto;
      }

      req.flash('success', 'Profile updated successfully');
      res.redirect('/profile');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/profile');
    }
  },

  logout(req, res) {
    req.session.destroy((err) => {
      if (err) console.error('Session destroy error:', err);
      res.clearCookie('connect.sid');
      res.redirect('/auth/login');
    });
  },
};

module.exports = authController;
