const payrollService = require('./payroll.service');
const { validatePayrollRun } = require('../../utils/validation.util');
const { getMonthName } = require('../../utils/helper.util');

const payrollController = {
  // GET /payroll
  async index(req, res) {
    try {
      const payrolls = await payrollService.getAllPayrolls();
      res.render('pages/payroll/index', { title: 'Payroll', payrolls, getMonthName });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /payroll/run
  async runForm(req, res) {
    try {
      const now = new Date();
      res.render('pages/payroll/run', {
        title: 'Run Payroll',
        defaultMonth: now.getMonth() + 1,  // current month (1-indexed)
        defaultYear: now.getFullYear(),
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/payroll');
    }
  },

  // POST /payroll/run
  async run(req, res) {
    try {
      const validationErrors = validatePayrollRun(req.body);
      if (validationErrors.length > 0) {
        const now = new Date();
        return res.render('pages/payroll/run', {
          title: 'Run Payroll',
          defaultMonth: parseInt(req.body.month) || now.getMonth() + 1,
          defaultYear: parseInt(req.body.year) || now.getFullYear(),
          errors: validationErrors,
          old: req.body,
        });
      }

      const month = parseInt(req.body.month, 10);
      const year = parseInt(req.body.year, 10);
      const processedBy = req.session.user ? req.session.user.employeeId : null;

      await payrollService.runPayroll(month, year, processedBy);
      req.flash('success', `Payroll for ${getMonthName(month)} ${year} processed successfully`);
      res.redirect('/payroll');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/payroll/run');
    }
  },

  // GET /payroll/:id
  async detail(req, res) {
    try {
      const { payroll, payslips } = await payrollService.getPayrollById(req.params.id);
      res.render('pages/payroll/detail', {
        title: `Payroll — ${getMonthName(payroll.month)} ${payroll.year}`,
        payroll,
        payslips,
        getMonthName,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/payroll');
    }
  },

  // POST /payroll/:id/mark-paid
  async markPaid(req, res) {
    try {
      await payrollService.markAsPaid(req.params.id);
      req.flash('success', 'Payroll marked as paid');
      res.redirect(`/payroll/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/payroll');
    }
  },
};

module.exports = payrollController;
