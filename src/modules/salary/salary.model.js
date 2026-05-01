const mongoose = require('mongoose');

const revisionSchema = new mongoose.Schema(
  {
    basicSalary: { type: Number, required: true },
    hra: { type: Number, required: true },
    specialAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true },
    netSalary: { type: Number, required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    revisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    remarks: { type: String },
  },
  { _id: false }
);

const salarySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
    },
    earnings: {
      basicSalary: { type: Number, required: true, min: 1 },
      hra: { type: Number, default: 0 },               // 40% of basic — auto-set in service
      specialAllowance: { type: Number, default: 0 },
      transportAllowance: { type: Number, default: 0 },
      medicalAllowance: { type: Number, default: 0 },
      otherAllowances: { type: Number, default: 0 },
    },
    deductions: {
      pf: { type: Number, default: 0 },                // 12% of basic — auto-set in service
      esi: { type: Number, default: 0 },               // 0.75% of gross if ≤21000 — auto-set
      tax: { type: Number, default: 0 },               // Indian tax slab — auto-set
      otherDeductions: { type: Number, default: 0 },
    },
    grossSalary: { type: Number, default: 0 },         // sum of all earnings
    netSalary: { type: Number, default: 0 },           // gross − total deductions
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    isActive: { type: Boolean, default: true },
    revisionHistory: [revisionSchema],
  },
  { timestamps: true }
);

salarySchema.index({ isActive: 1 });

module.exports = mongoose.model('Salary', salarySchema);
