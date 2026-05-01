const salaryService = require('./salary.service');
const employeeService = require('../employee/employee.service');
const { validateSalaryStructure } = require('../../utils/validation.util');

const salaryController = {
  // GET /salary
  async index(req, res) {
    try {
      const salaries = await salaryService.getAllSalaries();
      res.render('pages/salary/index', { title: 'Salary Structures', salaries });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /salary/create
  async createForm(req, res) {
    try {
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/salary/create', { title: 'Assign Salary Structure', employees, salary: null });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/salary');
    }
  },

  // POST /salary/create
  async create(req, res) {
    try {
      const validationErrors = validateSalaryStructure(req.body);
      if (validationErrors.length > 0) {
        const employees = await employeeService.getAllEmployees({ status: 'active' });
        return res.render('pages/salary/create', {
          title: 'Assign Salary Structure',
          employees,
          salary: null,
          errors: validationErrors,
          old: req.body,
        });
      }

      const revisedBy = req.session.user ? req.session.user.employeeId : null;
      await salaryService.assignSalary(req.body, revisedBy);
      req.flash('success', 'Salary structure assigned successfully');
      res.redirect('/salary');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/salary/create');
    }
  },

  // GET /salary/:employeeId/edit
  async editForm(req, res) {
    try {
      const salary = await salaryService.getSalaryByEmployee(req.params.employeeId);
      if (!salary) {
        req.flash('error', 'No salary structure found for this employee');
        return res.redirect('/salary');
      }
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/salary/edit', { title: 'Edit Salary Structure', salary, employees });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/salary');
    }
  },

  // PUT /salary/:employeeId
  async update(req, res) {
    try {
      const validationErrors = validateSalaryStructure({ ...req.body, employeeId: req.params.employeeId });
      if (validationErrors.length > 0) {
        const salary = await salaryService.getSalaryByEmployee(req.params.employeeId);
        const employees = await employeeService.getAllEmployees({ status: 'active' });
        return res.render('pages/salary/edit', {
          title: 'Edit Salary Structure',
          salary,
          employees,
          errors: validationErrors,
          old: req.body,
        });
      }

      const revisedBy = req.session.user ? req.session.user.employeeId : null;
      await salaryService.updateSalary(req.params.employeeId, req.body, revisedBy);
      req.flash('success', 'Salary structure updated successfully');
      res.redirect('/salary');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/salary/${req.params.employeeId}/edit`);
    }
  },
};

module.exports = salaryController;
