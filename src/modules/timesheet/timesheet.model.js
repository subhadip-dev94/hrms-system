const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: { type: Date, required: true },
    projectName: { type: String, required: true, trim: true },
    taskDescription: { type: String, required: true, trim: true },
    hours: { type: Number, required: true, min: 0.5, max: 24 },
    workType: {
      type: String,
      enum: ['billable', 'non-billable'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected'],
      default: 'draft',
    },
    managerComment: { type: String },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    approvedAt: { type: Date },
    isLocked: { type: Boolean, default: false },
    weekStart: { type: Date }, // Monday of the entry's week — set in service
  },
  { timestamps: true }
);

// Fast look-ups by employee + week
timesheetSchema.index({ employeeId: 1, date: 1 });
timesheetSchema.index({ employeeId: 1, weekStart: 1 });

module.exports = mongoose.model('Timesheet', timesheetSchema);
