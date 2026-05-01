const employeeService = require('./employee.service');
const departmentService = require('../department/department.service');

const employeeController = {
  // GET /employees
  async index(req, res) {
    try {
      const filters = {
        search: req.query.search || '',
        departmentId: req.query.departmentId || '',
        status: req.query.status || '',
      };

      const [employees, departments] = await Promise.all([
        employeeService.getAllEmployees(filters),
        departmentService.getAllDepartments(),
      ]);

      res.render('pages/employee/index', {
        title: 'Employees',
        employees,
        departments,
        filters,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /employees/create
  async getCreate(req, res) {
    try {
      const [departments, managers] = await Promise.all([
        departmentService.getAllDepartments(),
        employeeService.getAllEmployees({ status: 'active' }),
      ]);

      res.render('pages/employee/create', {
        title: 'Add Employee',
        departments,
        managers,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/employees');
    }
  },

  // POST /employees/create
  async postCreate(req, res) {
    try {
      await employeeService.createEmployee(req.body, req.file);
      req.flash('success', 'Employee created successfully. Login credentials have been sent to their email address.');
      res.redirect('/employees');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/employees/create');
    }
  },

  // GET /employees/:id/edit
  async getEdit(req, res) {
    try {
      const [employee, departments, managers] = await Promise.all([
        employeeService.getEmployeeById(req.params.id),
        departmentService.getAllDepartments(),
        employeeService.getAllEmployees({ status: 'active' }),
      ]);

      if (!employee) {
        req.flash('error', 'Employee not found');
        return res.redirect('/employees');
      }

      res.render('pages/employee/edit', {
        title: 'Edit Employee',
        employee,
        departments,
        // Exclude the employee being edited from manager options
        managers: managers.filter(
          (m) => m._id.toString() !== req.params.id
        ),
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/employees');
    }
  },

  // PUT /employees/:id
  async postEdit(req, res) {
    try {
      await employeeService.updateEmployee(req.params.id, req.body, req.file);
      req.flash('success', 'Employee updated successfully');
      res.redirect('/employees');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/employees/${req.params.id}/edit`);
    }
  },

  // DELETE /employees/:id
  async softDelete(req, res) {
    try {
      await employeeService.softDeleteEmployee(req.params.id);
      req.flash('success', 'Employee terminated and account deactivated');
      res.redirect('/employees');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/employees');
    }
  },
};

module.exports = employeeController;
