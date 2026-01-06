import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['public', 'religious', 'national', 'company'],
    default: 'public'
  },
  description: {
    type: String,
    trim: true
  },
  isOptional: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient date queries
holidaySchema.index({ date: 1 });
holidaySchema.index({ type: 1 });

export default mongoose.model('Holiday', holidaySchema);