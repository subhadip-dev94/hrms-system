const departmentService = require('./department.service');
const employeeService = require('../employee/employee.service');
const Employee = require('../employee/employee.model');

const departmentController = {
  // GET /departments
  async index(req, res) {
    try {
      const departments = await departmentService.getAllDepartments();

      // Attach active employee count to each department
      const departmentsWithCounts = await Promise.all(
        departments.map(async (dept) => {
          const employeeCount = await Employee.countDocuments({
            departmentId: dept._id,
            status: { $ne: 'terminated' },
          });
          return { ...dept, employeeCount };
        })
      );

      res.render('pages/department/index', {
        title: 'Departments',
        departments: departmentsWithCounts,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /departments/create
  async getCreate(req, res) {
    try {
      const managers = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/department/create', {
        title: 'Add Department',
        managers,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/departments');
    }
  },

  // POST /departments/create
  async postCreate(req, res) {
    try {
      const data = { ...req.body };
      // hidden + checkbox pattern sends ['false','true'] when checked — normalise to boolean
      data.isActive = Array.isArray(data.isActive)
        ? data.isActive.includes('true')
        : data.isActive === 'true';
      await departmentService.createDepartment(data);
      req.flash('success', 'Department created successfully');
      res.redirect('/departments');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/departments/create');
    }
  },

  // GET /departments/:id/edit
  async getEdit(req, res) {
    try {
      const [department, managers] = await Promise.all([
        departmentService.getDepartmentById(req.params.id),
        employeeService.getAllEmployees({ status: 'active' }),
      ]);

      if (!department) {
        req.flash('error', 'Department not found');
        return res.redirect('/departments');
      }

      res.render('pages/department/edit', {
        title: 'Edit Department',
        department,
        managers,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/departments');
    }
  },

  // PUT /departments/:id
  async postEdit(req, res) {
    try {
      const data = { ...req.body };
      data.isActive = Array.isArray(data.isActive)
        ? data.isActive.includes('true')
        : data.isActive === 'true';
      await departmentService.updateDepartment(req.params.id, data);
      req.flash('success', 'Department updated successfully');
      res.redirect('/departments');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/departments/${req.params.id}/edit`);
    }
  },

  // DELETE /departments/:id
  async deleteDepartment(req, res) {
    try {
      await departmentService.deleteDepartment(req.params.id);
      req.flash('success', 'Department deleted successfully');
      res.redirect('/departments');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/departments');
    }
  },
};

module.exports = departmentController;
