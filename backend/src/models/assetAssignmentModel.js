import mongoose from 'mongoose';

const assetAssignmentSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Assignment details
    assignedDate: {
      type: Date,
      required: true,
    },
    conditionAtAssignment: {
      type: String,
      enum: ['new', 'good', 'fair', 'poor'],
      required: true,
    },
    remarks: String,

    // Return details (filled when returned)
    returnDate: Date,
    conditionOnReturn: {
      type: String,
      enum: ['good', 'minor_damage', 'needs_repair', 'lost'],
    },
    returnRemarks: String,
    returnedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Status of this assignment record
    status: {
      type: String,
      enum: ['active', 'returned', 'lost'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Indexes
assetAssignmentSchema.index({ asset: 1, status: 1 });
assetAssignmentSchema.index({ employee: 1, status: 1 });
assetAssignmentSchema.index({ assignedDate: -1 });

export default mongoose.model('AssetAssignment', assetAssignmentSchema);
