const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./user.model');
const Employee = require('../employee/employee.model');

const authService = {

  // ─── Login ────────────────────────────────────────────────────────────────────
  async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() }).populate(
      'employeeId',
      'firstName lastName profilePhoto'
    );

    if (!user) throw new Error('Invalid email or password');
    if (!user.isActive) throw new Error('Your account has been deactivated. Please contact admin.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid email or password');

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const emp = user.employeeId;
    const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Admin';

    return {
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        name,
        employeeId: emp ? emp._id : null,
        profilePhoto: emp ? emp.profilePhoto : null,
      },
    };
  },

  // ─── Change own password (all authenticated users) ────────────────────────────
  async changeOwnPassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).populate('employeeId', 'firstName lastName');
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('Current password is incorrect');

    if (!newPassword || newPassword.length < 6)
      throw new Error('New password must be at least 6 characters');

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Notify user that their password was changed
    try {
      const { sendPasswordChangedEmail } = require('../../utils/email.util');
      const emp = user.employeeId;
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Admin';
      sendPasswordChangedEmail(user.email, name);
    } catch (_) {}
  },

  // ─── Admin/HR: reset any user's password ─────────────────────────────────────
  // Admin  → can reset anyone
  // HR     → can only reset users with role === 'employee'
  async resetUserPassword(targetUserId, newPassword, requesterRole) {
    if (!newPassword || newPassword.length < 6)
      throw new Error('Password must be at least 6 characters');

    const user = await User.findById(targetUserId).populate('employeeId', 'firstName lastName');
    if (!user) throw new Error('User not found');

    if (requesterRole === 'hr' && user.role !== 'employee') {
      throw new Error('HR can only reset passwords for employees');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Email the user their new password
    try {
      const { sendPasswordResetEmail } = require('../../utils/email.util');
      const emp = user.employeeId;
      const name = emp ? `${emp.firstName} ${emp.lastName}` : user.email;
      sendPasswordResetEmail(user.email, name, newPassword);
    } catch (_) {}
  },

  // ─── Get user list for password management page ───────────────────────────────
  async getUsersForPasswordManagement(requesterRole) {
    const filter = requesterRole === 'hr' ? { role: 'employee' } : {};
    return User.find(filter)
      .populate('employeeId', 'firstName lastName employeeCode designation')
      .sort({ role: 1, createdAt: -1 })
      .lean();
  },

  // ─── Get full profile for the logged-in user ──────────────────────────────────
  async getProfile(employeeId) {
    return Employee.findById(employeeId)
      .populate('departmentId', 'name')
      .populate('managerId', 'firstName lastName designation')
      .lean();
  },

  // ─── Update own profile (personal + bank details) ─────────────────────────────
  async updateProfile(employeeId, data) {
    const update = {};
    if (data.phone   !== undefined) update.phone   = data.phone.trim();
    if (data.address !== undefined) update.address = data.address.trim();
    if (data.bankName      !== undefined) update['bankDetails.bankName']      = data.bankName.trim();
    if (data.accountNumber !== undefined) update['bankDetails.accountNumber'] = data.accountNumber.trim();
    if (data.ifscCode      !== undefined) update['bankDetails.ifscCode']      = data.ifscCode.trim().toUpperCase();
    if (data.profilePhoto  !== undefined) update.profilePhoto = data.profilePhoto;

    return Employee.findByIdAndUpdate(employeeId, update, { new: true }).lean();
  },
};

module.exports = authService;
