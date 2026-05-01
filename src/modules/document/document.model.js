const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    documentType: {
      type: String,
      enum: [
        'id-proof', 'address-proof', 'education-certificate',
        'experience-letter', 'offer-letter', 'appointment-letter',
        'salary-slip', 'resignation-letter', 'nda', 'contract',
        'appraisal-letter', 'other',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    isVisibleToEmployee: { type: Boolean, default: true },
    description: { type: String, trim: true },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

documentSchema.index({ employeeId: 1, documentType: 1 });
documentSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('Document', documentSchema);
