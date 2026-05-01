const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    targetRoles: {
      type: [String],
      enum: ['admin', 'hr', 'manager', 'employee', 'finance', 'all'],
      default: ['all'],
    },
    isPinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true }, // soft delete
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],
  },
  { timestamps: true }
);

announcementSchema.index({ isActive: 1, targetRoles: 1, createdAt: -1 });
announcementSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
