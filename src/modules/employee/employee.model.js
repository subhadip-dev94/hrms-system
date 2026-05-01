const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    dateOfBirth: {
      type: Date,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    designation: {
      type: String,
      trim: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'hr', 'manager', 'employee', 'finance'],
      default: 'employee',
    },
    status: {
      type: String,
      enum: ['active', 'resigned', 'terminated'],
      default: 'active',
    },
    address: {
      type: String,
      trim: true,
    },
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({}),
    },
    profilePhoto: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Virtual: full name
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

employeeSchema.index({ status: 1 });
employeeSchema.index({ departmentId: 1 });
employeeSchema.index({ managerId: 1 });
employeeSchema.index({ status: 1, departmentId: 1 });
employeeSchema.index({ joiningDate: -1 });

module.exports = mongoose.model('Employee', employeeSchema);
