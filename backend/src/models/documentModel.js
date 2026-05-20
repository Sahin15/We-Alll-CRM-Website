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
      // Personal documents
      'aadhaar', 'pan', 'bank', 'passport', 'driving_license', 'education',
      // HR / employment (post-join; offer_letter often linked from Offer module)
      'offer_letter', 'joining_letter', 'employment_contract', 'nda',
      'policy_acknowledgment', 'increment_letter', 'bonus_letter',
      'promotion_letter', 'appraisal_letter', 'leave_approval',
      // Exit & other
      'resignation_letter', 'experience_letter', 'relieving_letter',
      'experience_certificate', 'medical_certificate', 'other',
      // Legacy (kept for existing records)
      'salary_slip', 'appraisal', 'acknowledgement'
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
  },
  // Document verification fields
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verificationDate: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
documentSchema.index({ userId: 1, category: 1 });
documentSchema.index({ isOfficial: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ verificationStatus: 1 });

export default mongoose.model('Document', documentSchema);