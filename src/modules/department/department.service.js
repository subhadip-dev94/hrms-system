const Department = require('./department.model');
const Employee = require('../employee/employee.model');

const departmentService = {
  // ─── List all departments ───────────────────────────────────────────────────
  async getAllDepartments(activeOnly = false) {
    const query = activeOnly ? { isActive: true } : {};
    return await Department.find(query)
      .populate('managerId', 'firstName lastName')
      .sort({ name: 1 })
      .lean();
  },

  // ─── Get single department ──────────────────────────────────────────────────
  async getDepartmentById(id) {
    return await Department.findById(id).populate(
      'managerId',
      'firstName lastName employeeCode'
    );
  },

  // ─── Create department ──────────────────────────────────────────────────────
  async createDepartment(data) {
    if (!data.managerId) delete data.managerId;
    data.code = data.code.toUpperCase().trim();
    return await Department.create(data);
  },

  // ─── Update department ──────────────────────────────────────────────────────
  async updateDepartment(id, data) {
    if (!data.managerId) data.managerId = null;
    if (data.code) data.code = data.code.toUpperCase().trim();

    const dept = await Department.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!dept) throw new Error('Department not found');
    return dept;
  },

  // ─── Delete department (blocked if active employees exist) ─────────────────
  async deleteDepartment(id) {
    const activeCount = await Employee.countDocuments({
      departmentId: id,
      status: { $ne: 'terminated' },
    });

    if (activeCount > 0) {
      throw new Error(
        `Cannot delete: ${activeCount} active employee(s) are assigned to this department. Reassign them first.`
      );
    }

    const dept = await Department.findByIdAndDelete(id);
    if (!dept) throw new Error('Department not found');
    return dept;
  },
};

module.exports = departmentService;
