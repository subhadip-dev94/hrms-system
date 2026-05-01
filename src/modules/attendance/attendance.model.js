const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    workHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day', 'late', 'on-leave', 'holiday'],
      default: 'present',
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    overtime: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      trim: true,
    },
    markedBy: {
      type: String,
      enum: ['self', 'hr', 'admin'],
      default: 'self',
    },
  },
  { timestamps: true }
);

// Unique per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
