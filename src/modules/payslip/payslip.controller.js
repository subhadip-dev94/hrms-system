const payslipService = require('./payslip.service');
const path = require('path');
const fs = require('fs-extra');
const { getMonthName } = require('../../utils/helper.util');

const payslipController = {
  // GET /payslips/my — employee's own payslips
  async myPayslips(req, res) {
    try {
      const employeeId = req.session.user ? req.session.user.employeeId : null;
      const payslips = await payslipService.getPayslipsByEmployee(employeeId);
      res.render('pages/payslip/index', {
        title: 'My Payslips',
        payslips,
        getMonthName,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /payslips/:id — view a single payslip
  async view(req, res) {
    try {
      const payslip = await payslipService.getPayslipById(req.params.id);

      // Non-finance/hr/admin users can only view their own payslip
      const user = req.session.user;
      const isPrivileged = ['admin', 'hr', 'finance'].includes(user.role);
      if (!isPrivileged && String(payslip.employeeId._id) !== String(user.employeeId)) {
        req.flash('error', 'You do not have permission to view this payslip');
        return res.redirect('/payslips/my');
      }

      res.render('pages/payslip/view', {
        title: `Payslip — ${getMonthName(payslip.month)} ${payslip.year}`,
        payslip,
        getMonthName,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/payslips/my');
    }
  },

  // GET /payslips/:id/download — serve PDF file
  async download(req, res) {
    try {
      const payslip = await payslipService.getPayslipById(req.params.id);

      // Access control
      const user = req.session.user;
      const isPrivileged = ['admin', 'hr', 'finance'].includes(user.role);
      if (!isPrivileged && String(payslip.employeeId._id) !== String(user.employeeId)) {
        req.flash('error', 'You do not have permission to download this payslip');
        return res.redirect('/payslips/my');
      }

      if (!payslip.pdfPath) {
        req.flash('error', 'PDF not yet generated for this payslip');
        return res.redirect(`/payslips/${req.params.id}`);
      }

      const absPath = path.join(__dirname, '../../../public', payslip.pdfPath);
      if (!(await fs.pathExists(absPath))) {
        req.flash('error', 'PDF file not found on server');
        return res.redirect(`/payslips/${req.params.id}`);
      }

      await payslipService.markDownloaded(req.params.id);
      res.download(absPath, path.basename(absPath));
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/payslips/my');
    }
  },

  // POST /payslips/:id/email — email payslip to employee
  async email(req, res) {
    try {
      await payslipService.emailPayslip(req.params.id);
      req.flash('success', 'Payslip emailed successfully');
      res.redirect(`/payslips/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/payslips/${req.params.id}`);
    }
  },
};

module.exports = payslipController;
