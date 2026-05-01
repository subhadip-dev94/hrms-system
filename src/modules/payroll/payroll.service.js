const Payroll = require('./payroll.model');
const Payslip = require('../payslip/payslip.model');
const Salary = require('../salary/salary.model');
const Employee = require('../employee/employee.model');
const Attendance = require('../attendance/attendance.model');
const Leave = require('../leave/leave.model');
const Holiday = require('../holiday/holiday.model');
const { generatePayslipPDF } = require('../payslip/payslip.util');
const { getMonthDateRange, calculateWorkingDays, roundToTwo } = require('../../utils/helper.util');
const errors = require('../../utils/errorCodes.util');

// ─── Build payslip data from pre-loaded arrays (no DB calls inside) ────────────
// All holiday / attendance / leave data is passed in — fetched once for the whole run.
function buildPayslipData(employee, salary, month, year, payrollId, holidays, attendanceRecords, leaveRecords) {
  const { startDate, endDate } = getMonthDateRange(month, year);

  const holidayCount   = holidays.length;
  const workingDays    = calculateWorkingDays(startDate, endDate, holidays);

  const presentDays    = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
  const halfDays       = attendanceRecords.filter(a => a.status === 'half-day').length;
  const effectivePresent = roundToTwo(presentDays + halfDays * 0.5);
  const overtimeHours  = roundToTwo(attendanceRecords.reduce((s, a) => s + (a.overtime || 0), 0));

  // Sum approved leave days that overlap the payroll month
  let leaveDays = 0;
  leaveRecords.forEach(l => { leaveDays += l.totalDays || 0; });

  const absentDays     = Math.max(0, workingDays - effectivePresent - leaveDays);
  const perDay         = workingDays > 0 ? roundToTwo(salary.grossSalary / workingDays) : 0;
  const overtimePay    = roundToTwo(((salary.earnings.basicSalary / 26) / 8) * 1.5 * overtimeHours);
  const absentDeduction = roundToTwo(perDay * absentDays);
  const grossEarnings  = roundToTwo(salary.grossSalary + overtimePay);

  const pf              = salary.deductions.pf;
  const esi             = salary.deductions.esi;
  const tax             = salary.deductions.tax;
  const otherDeductions = salary.deductions.otherDeductions || 0;
  const totalDeductions = roundToTwo(absentDeduction + pf + esi + tax + otherDeductions);
  const netPay          = roundToTwo(grossEarnings - totalDeductions);

  return {
    employeeId: employee._id,
    payrollId,
    month,
    year,
    attendance: { workingDays, presentDays: effectivePresent, absentDays, leaveDays, holidays: holidayCount, overtimeHours },
    earnings: {
      basicSalary:        salary.earnings.basicSalary,
      hra:                salary.earnings.hra,
      specialAllowance:   salary.earnings.specialAllowance,
      transportAllowance: salary.earnings.transportAllowance,
      medicalAllowance:   salary.earnings.medicalAllowance,
      otherAllowances:    salary.earnings.otherAllowances,
      overtimePay,
      grossEarnings,
    },
    deductions: { absentDeduction, pf, esi, tax, otherDeductions, totalDeductions },
    netPay,
    status: 'generated',
  };
}

const payrollService = {
  // ─── List all payroll records ────────────────────────────────────────────
  async getAllPayrolls() {
    return await Payroll.find()
      .populate('processedBy', 'firstName lastName')
      .sort({ year: -1, month: -1 })
      .lean();
  },

  // ─── Get a single payroll with its payslips ──────────────────────────────
  async getPayrollById(id) {
    const payroll = await Payroll.findById(id)
      .populate('processedBy', 'firstName lastName')
      .lean();

    if (!payroll) throw new Error(errors.PAYROLL_NOT_FOUND);

    const payslips = await Payslip.find({ payrollId: id })
      .populate('employeeId', 'firstName lastName employeeCode departmentId designation')
      .lean();

    return { payroll, payslips };
  },

  // ─── Run payroll for a month/year ────────────────────────────────────────
  // Was: 1 + 3*N DB queries (Holiday + Attendance + Leave per employee)
  // Now: 5 queries total regardless of employee count
  async runPayroll(month, year, processedBy) {
    const existing = await Payroll.findOne({ month, year });
    if (existing) throw new Error(errors.PAYROLL_ALREADY_RUN);

    const { startDate, endDate } = getMonthDateRange(month, year);

    // ── Batch-load everything needed for all payslips in one pass ───────────
    const [activeEmployees, salaries, holidays, allAttendance, allLeaves] = await Promise.all([
      Employee.find({ status: 'active' }).lean(),
      Salary.find({ isActive: true }).lean(),
      Holiday.find({ date: { $gte: startDate, $lte: endDate } }).lean(),
      Attendance.find({
        date:   { $gte: startDate, $lte: endDate },
        status: { $in: ['present', 'late', 'half-day'] },
      }).lean(),
      Leave.find({
        status:    'approved',
        startDate: { $lte: endDate },
        endDate:   { $gte: startDate },
      }).lean(),
    ]);

    // Build O(1) lookup maps keyed by employeeId string
    const salaryMap = {};
    salaries.forEach(s => { salaryMap[String(s.employeeId)] = s; });

    const attendanceMap = {};
    allAttendance.forEach(a => {
      const k = String(a.employeeId);
      if (!attendanceMap[k]) attendanceMap[k] = [];
      attendanceMap[k].push(a);
    });

    const leaveMap = {};
    allLeaves.forEach(l => {
      const k = String(l.employeeId);
      if (!leaveMap[k]) leaveMap[k] = [];
      leaveMap[k].push(l);
    });

    // Create payroll header (draft)
    const payroll = await Payroll.create({
      month,
      year,
      status:      'draft',
      processedBy,
      processedAt: new Date(),
    });

    let totalGross      = 0;
    let totalDeductions = 0;
    let totalNetPay     = 0;
    let totalEmployees  = 0;

    const eligibleEmployees = activeEmployees.filter(emp => salaryMap[String(emp._id)]);

    const payslipPromises = eligibleEmployees.map(async (emp) => {
      const salary         = salaryMap[String(emp._id)];
      const empAttendance  = attendanceMap[String(emp._id)] || [];
      const empLeaves      = leaveMap[String(emp._id)]      || [];

      const payslipData = buildPayslipData(emp, salary, month, year, payroll._id, holidays, empAttendance, empLeaves);
      const payslip     = await Payslip.create(payslipData);

      // Generate PDF (non-blocking on failure)
      try {
        const pdfPath = await generatePayslipPDF({
          employee: {
            firstName:    emp.firstName,
            lastName:     emp.lastName,
            employeeCode: emp.employeeCode,
            designation:  emp.designation,
            department:   emp.departmentId ? emp.departmentId.name : '',
          },
          payslip: payslipData,
        });
        await Payslip.findByIdAndUpdate(payslip._id, { pdfPath });
      } catch (pdfErr) {
        console.error(`[PAYROLL] PDF failed for ${emp.employeeCode}:`, pdfErr.message);
      }

      totalGross      += payslipData.earnings.grossEarnings;
      totalDeductions += payslipData.deductions.totalDeductions;
      totalNetPay     += payslipData.netPay;
      totalEmployees++;

      return payslip;
    });

    await Promise.all(payslipPromises);

    await Payroll.findByIdAndUpdate(payroll._id, {
      status:         'processed',
      totalEmployees,
      totalGross:     roundToTwo(totalGross),
      totalDeductions: roundToTwo(totalDeductions),
      totalNetPay:    roundToTwo(totalNetPay),
    });

    return await Payroll.findById(payroll._id).lean();
  },

  // ─── Mark payroll as paid ────────────────────────────────────────────────
  async markAsPaid(id) {
    const payroll = await Payroll.findById(id);
    if (!payroll) throw new Error(errors.PAYROLL_NOT_FOUND);
    payroll.status = 'paid';
    return await payroll.save();
  },

  // ─── Dashboard stats: latest payroll ─────────────────────────────────────
  async getLatestPayroll() {
    return await Payroll.findOne({ status: { $in: ['processed', 'paid'] } })
      .sort({ year: -1, month: -1 })
      .lean();
  },
};

module.exports = payrollService;
