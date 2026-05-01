const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Holiday date is required'],
      unique: true,
    },
    type: {
      type: String,
      enum: ['public', 'optional'],
      default: 'public',
    },
    description: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
      // auto-set in the service before create/update
    },
  },
  { timestamps: true }
);

holidaySchema.index({ year: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
