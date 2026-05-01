const bcrypt = require('bcryptjs');
const Employee = require('./employee.model');
const User = require('../auth/user.model');
const leaveService = require('../leave/leave.service');
const { generateDefaultPassword } = require('../../utils/helper.util');
const { sendWelcomeEmail } = require('../../utils/email.util');

const employeeService = {
  // ─── Auto-generate next employee code ──────────────────────────────────────
  async generateEmployeeCode() {
    const employees = await Employee.find({}, 'employeeCode').lean();
    let maxNum = 0;
    employees.forEach((emp) => {
      if (emp.employeeCode) {
        const match = emp.employeeCode.match(/^EMP(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return `EMP${String(maxNum + 1).padStart(3, '0')}`;
  },

  // ─── List employees with optional filters ──────────────────────────────────
  async getAllEmployees(filters = {}) {
    const query = {};

    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { employeeCode: regex },
        { designation: regex },
        { phone: regex },
      ];
    }

    if (filters.departmentId) {
      query.departmentId = filters.departmentId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    return await Employee.find(query)
      .populate('departmentId', 'name code')
      .populate('managerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  },

  // ─── Get single employee ────────────────────────────────────────────────────
  async getEmployeeById(id) {
    return await Employee.findById(id)
      .populate('departmentId', 'name code')
      .populate('managerId', 'firstName lastName employeeCode');
  },

  // ─── Create employee + user account ────────────────────────────────────────
  async createEmployee(data, file) {
    // Clean up empty ObjectId strings
    if (!data.departmentId) delete data.departmentId;
    if (!data.managerId) delete data.managerId;

    data.employeeCode = await this.generateEmployeeCode();

    if (file) {
      // Cloudinary: file.path = secure URL, file.filename = public_id
      data.profilePhoto    = file.path;
      data.profilePhotoId  = file.filename;
    }

    let employee;
    try {
      employee = await Employee.create(data);
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        if (field === 'email') throw new Error('An employee with this email address already exists.');
        throw new Error(`Duplicate value for ${field}. Please use a different value.`);
      }
      throw err;
    }

    // Create linked user account with a unique generated password
    const defaultPassword = generateDefaultPassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    await User.create({
      employeeId: employee._id,
      email: employee.email,
      password: hashedPassword,
      role: employee.role,
      isActive: true,
    });

    // Send welcome email with credentials (non-blocking)
    const fullName = `${employee.firstName} ${employee.lastName}`;
    sendWelcomeEmail(employee.email, fullName, employee.email, defaultPassword);

    // Initialise leave balance for the new employee (Phase 2)
    await leaveService.initLeaveBalance(employee._id);

    return employee;
  },

  // ─── Update employee ────────────────────────────────────────────────────────
  async updateEmployee(id, data, file) {
    if (!data.departmentId) data.departmentId = null;
    if (!data.managerId) data.managerId = null;

    if (file) {
      // Delete old Cloudinary photo before replacing
      const existing = await Employee.findById(id).select('profilePhotoId').lean();
      if (existing && existing.profilePhotoId) {
        const { deleteFromCloudinary } = require('../../config/cloudinary');
        await deleteFromCloudinary(existing.profilePhotoId, 'image');
      }
      data.profilePhoto   = file.path;
      data.profilePhotoId = file.filename;
    }

    let employee;
    try {
      employee = await Employee.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        if (field === 'email') throw new Error('An employee with this email address already exists.');
        throw new Error(`Duplicate value for ${field}. Please use a different value.`);
      }
      throw err;
    }

    if (!employee) throw new Error('Employee not found');

    // Sync role change to the linked user account
    if (data.role) {
      await User.findOneAndUpdate({ employeeId: id }, { role: data.role });
    }

    return employee;
  },

  // ─── Soft delete (set status = terminated) ─────────────────────────────────
  async softDeleteEmployee(id) {
    const employee = await Employee.findByIdAndUpdate(
      id,
      { status: 'terminated' },
      { new: true }
    );

    if (!employee) throw new Error('Employee not found');

    // Deactivate the linked user account
    await User.findOneAndUpdate({ employeeId: id }, { isActive: false });

    return employee;
  },

  // ─── Dashboard stats ────────────────────────────────────────────────────────
  async getDashboardStats() {
    const Department = require('../department/department.model');

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const [total, active, departments, newThisMonth, recent] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Department.countDocuments({ isActive: true }),
      Employee.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Employee.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('departmentId', 'name')
        .lean(),
    ]);

    return { total, active, departments, newThisMonth, recent };
  },
};

module.exports = employeeService;
