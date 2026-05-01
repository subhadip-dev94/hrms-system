const mongoose = require('mongoose');

const stageHistorySchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    note: { type: String },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    scheduledAt: { type: Date },
    mode: { type: String, enum: ['in-person', 'video', 'phone'] },
    interviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    feedback: { type: String },
    result: { type: String, enum: ['pass', 'fail', 'hold'] },
  },
  { _id: true }
);

const candidateSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    totalExperience: { type: Number, default: 0 },
    currentCompany: { type: String, trim: true },
    currentSalary: { type: Number },
    expectedSalary: { type: Number },
    noticePeriod: { type: Number, default: 0 },   // days
    resumeUrl: { type: String },
    resumeId:  { type: String },
    source: {
      type: String,
      enum: ['direct', 'referral', 'linkedin', 'naukri', 'indeed', 'job-portal', 'campus', 'other'],
      default: 'direct',
    },
    stage: {
      type: String,
      enum: [
        'applied', 'screening', 'interview', 'technical',
        'hr-round', 'offer', 'offer-accepted', 'offer-rejected', 'joined',
      ],
      default: 'applied',
    },
    stageHistory: [stageHistorySchema],
    interviews: [interviewSchema],
    offerDetails: {
      offeredSalary: { type: Number },
      joiningDate: { type: Date },
      offerSentAt: { type: Date },
      offerAcceptedAt: { type: Date },
    },
    convertedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    isConverted: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

// One application per job per email
candidateSchema.index({ jobId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Candidate', candidateSchema);
