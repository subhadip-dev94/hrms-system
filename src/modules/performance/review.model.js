const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    reviewPeriod: { type: String, required: true },  // e.g. 'Q1 2025'
    reviewType: {
      type: String,
      enum: ['quarterly', 'half-yearly', 'annual'],
      default: 'quarterly',
    },
    ratings: {
      productivity: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      teamwork: { type: Number, min: 1, max: 5 },
      leadership: { type: Number, min: 1, max: 5 },
      technical: { type: Number, min: 1, max: 5 },
    },
    averageRating: { type: Number },  // auto-calculated in service
    grade: { type: String },          // auto-set from getPerformanceGrade()
    kpiScore: { type: Number },       // weighted KPI completion %
    overallComment: { type: String, required: true },
    strengthAreas: { type: String },
    improvementAreas: { type: String },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'acknowledged'],
      default: 'submitted',
    },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true }
);

// One review per employee per reviewer per period
reviewSchema.index({ employeeId: 1, reviewerId: 1, reviewPeriod: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
