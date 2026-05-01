const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    expenseCode: { type: String, unique: true },  // auto: EXP001
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    category: {
      type: String,
      enum: ['travel', 'food', 'accommodation', 'equipment', 'training', 'medical', 'other'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    expenseDate: { type: Date, required: true },
    receiptUrl: { type: String },  // path to uploaded receipt file

    status: {
      type: String,
      enum: ['draft', 'submitted', 'manager_approved', 'approved', 'rejected', 'paid'],
      default: 'draft',
    },

    managerAction: {
      actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      actionAt: { type: Date },
      comment: { type: String },
    },
    financeAction: {
      actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      actionAt: { type: Date },
      comment: { type: String },
    },

    paidAt: { type: Date },
    paymentMode: {
      type: String,
      enum: ['bank-transfer', 'cash', 'other'],
    },
  },
  { timestamps: true }
);

expenseSchema.index({ employeeId: 1, status: 1 });
expenseSchema.index({ expenseDate: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
