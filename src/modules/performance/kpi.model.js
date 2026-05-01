const mongoose = require('mongoose');

const progressHistorySchema = new mongoose.Schema(
  {
    value: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    note: { type: String },
  },
  { _id: false }
);

const kpiSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      enum: ['productivity', 'quality', 'communication', 'leadership', 'technical', 'other'],
      default: 'other',
    },
    targetValue: { type: Number, required: true, min: 0.01 },
    currentValue: { type: Number, default: 0 },
    unit: {
      type: String,
      enum: ['%', 'number', 'currency'],
      required: true,
    },
    weightage: { type: Number, default: 10, min: 1, max: 100 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    quarter: { type: String },   // auto-set in service: Q1–Q4
    year: { type: Number },      // auto-set in service from periodStart
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    progressHistory: [progressHistorySchema],
  },
  { timestamps: true }
);

kpiSchema.index({ employeeId: 1, status: 1 });

module.exports = mongoose.model('KPI', kpiSchema);
