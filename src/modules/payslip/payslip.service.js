const Payslip = require('./payslip.model');
const { sendPayslipEmail } = require('../../utils/email.util');
const errors = require('../../utils/errorCodes.util');

const payslipService = {
  // ─── Get payslips for a specific employee ─────────────────────────────────
  async getPayslipsByEmployee(employeeId) {
    return await Payslip.find({ employeeId })
      .sort({ year: -1, month: -1 })
      .lean();
  },

  // ─── Get a single payslip by id ───────────────────────────────────────────
  async getPayslipById(id) {
    const payslip = await Payslip.findById(id)
      .populate('employeeId', 'firstName lastName employeeCode designation departmentId email')
      .populate('payrollId')
      .lean();

    if (!payslip) throw new Error(errors.PAYSLIP_NOT_FOUND);
    return payslip;
  },

  // ─── Get payslip for a specific employee + month + year ──────────────────
  async getPayslipByPeriod(employeeId, month, year) {
    const payslip = await Payslip.findOne({ employeeId, month, year })
      .populate('employeeId', 'firstName lastName employeeCode designation departmentId email')
      .lean();

    if (!payslip) throw new Error(errors.PAYSLIP_NOT_FOUND);
    return payslip;
  },

  // ─── Email payslip to employee ────────────────────────────────────────────
  async emailPayslip(id) {
    const payslip = await Payslip.findById(id)
      .populate('employeeId', 'firstName lastName email')
      .lean();

    if (!payslip) throw new Error(errors.PAYSLIP_NOT_FOUND);

    const { employeeId: emp } = payslip;

    await sendPayslipEmail(
      emp.email,
      `${emp.firstName} ${emp.lastName}`,
      payslip.month,
      payslip.year,
      null  // PDF buffer not loaded into memory; path is on disk
    );

    await Payslip.findByIdAndUpdate(id, {
      status: 'emailed',
      emailedAt: new Date(),
    });

    return true;
  },

  // ─── Mark payslip as downloaded ──────────────────────────────────────────
  async markDownloaded(id) {
    await Payslip.findByIdAndUpdate(id, { status: 'downloaded' });
  },

  // ─── Summary counts for a payroll ─────────────────────────────────────────
  async getPayrollPayslipCount(payrollId) {
    return await Payslip.countDocuments({ payrollId });
  },
};

module.exports = payslipService;
