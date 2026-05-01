const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      required: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    attendance: {
      workingDays: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      leaveDays: { type: Number, default: 0 },
      holidays: { type: Number, default: 0 },
      overtimeHours: { type: Number, default: 0 },
    },
    earnings: {
      basicSalary: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      transportAllowance: { type: Number, default: 0 },
      medicalAllowance: { type: Number, default: 0 },
      otherAllowances: { type: Number, default: 0 },
      overtimePay: { type: Number, default: 0 },
      grossEarnings: { type: Number, default: 0 },
    },
    deductions: {
      absentDeduction: { type: Number, default: 0 },
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      otherDeductions: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
    },
    netPay: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['generated', 'emailed', 'downloaded'],
      default: 'generated',
    },
    pdfPath: { type: String },
    emailedAt: { type: Date },
  },
  { timestamps: true }
);

// One payslip per employee per month/year
payslipSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payslipSchema.index({ payrollId: 1 });
payslipSchema.index({ month: 1, year: 1 });

module.exports = mongoose.model('Payslip', payslipSchema);
