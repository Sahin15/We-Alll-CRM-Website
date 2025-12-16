import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      // Personal documents (uploaded by employees)
      'aadhaar', 'pan', 'bank', 'passport', 'driving_license', 'education',
      // Official documents (uploaded by HR/Admin)
      'salary_slip', 'joining_letter', 'offer_letter', 'appraisal', 
      'increment_letter', 'promotion_letter', 'leave_approval', 
      'acknowledgement', 'experience_letter', 'relieving_letter'
    ]
  },
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: function() {
      return this.originalName;
    }
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
documentSchema.index({ userId: 1, category: 1 });
documentSchema.index({ isOfficial: 1 });
documentSchema.index({ createdAt: -1 });

export default mongoose.model('Document', documentSchema);