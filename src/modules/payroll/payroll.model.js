const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'processed', 'paid'],
      default: 'draft',
    },
    totalEmployees: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalNetPay: { type: Number, default: 0 },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    processedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Prevent duplicate payroll for the same month/year
payrollSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
