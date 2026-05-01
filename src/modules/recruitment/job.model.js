const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    jobCode: { type: String, unique: true },  // auto: JOB001 — set in service
    title: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
      required: true,
    },
    experienceMin: { type: Number, default: 0 },
    experienceMax: { type: Number },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    location: { type: String, trim: true },
    description: { type: String, required: true },
    requirements: { type: String },
    applicationDeadline: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed', 'on-hold'],
      default: 'draft',
    },
    totalPositions: { type: Number, default: 1 },
    filledPositions: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, departmentId: 1 });

module.exports = mongoose.model('Job', jobSchema);
