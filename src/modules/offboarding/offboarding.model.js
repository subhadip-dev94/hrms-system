const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  item: { type: String },
  isCompleted: { type: Boolean, default: false },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  completedAt: { type: Date },
  notes: { type: String },
}, { _id: false });

const offboardingSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
    },
    exitType: {
      type: String,
      enum: ['resignation', 'termination', 'retirement', 'contract-end', 'absconding', 'other'],
      required: true,
    },
    resignationDate: { type: Date },
    lastWorkingDay: { type: Date, required: true },
    noticePeriod: { type: Number },

    reason: { type: String, required: true },

    status: {
      type: String,
      enum: ['initiated', 'in-progress', 'completed', 'cancelled'],
      default: 'initiated',
    },

    checklist: [checklistItemSchema],

    exitInterview: {
      scheduledAt: { type: Date },
      conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      feedback: { type: String },
      rating: { type: Number, min: 1, max: 5 },
      isCompleted: { type: Boolean, default: false },
    },

    finalSettlement: {
      basicSalary: { type: Number },
      leaveEncashment: { type: Number },
      bonus: { type: Number },
      deductions: { type: Number },
      netPayable: { type: Number },
      processedAt: { type: Date },
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    },

    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

offboardingSchema.index({ status: 1 });
offboardingSchema.index({ lastWorkingDay: 1 });

module.exports = mongoose.model('Offboarding', offboardingSchema);
