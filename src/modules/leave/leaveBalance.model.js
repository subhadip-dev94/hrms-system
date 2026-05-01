const mongoose = require('mongoose');

const balanceTypeSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
  },
  { _id: false }
);

const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
    },
    year: {
      type: Number,
      required: true,
    },
    casual: {
      type: balanceTypeSchema,
      default: () => ({ total: 12, used: 0, remaining: 12 }),
    },
    sick: {
      type: balanceTypeSchema,
      default: () => ({ total: 12, used: 0, remaining: 12 }),
    },
    earned: {
      type: balanceTypeSchema,
      default: () => ({ total: 15, used: 0, remaining: 15 }),
    },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ employeeId: 1, year: 1 });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
