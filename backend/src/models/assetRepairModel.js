import mongoose from 'mongoose';

const assetRepairSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssetAssignment',
    },

    // Problem details
    problemDescription: {
      type: String,
      required: true,
    },

    // Repair details
    repairVendor: String,
    repairCost: Number,
    repairDate: {
      type: Date,
      required: true,
    },
    expectedReturnDate: Date,

    // Completion
    actualReturnDate: Date,
    repairNotes: String,

    // Status
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Indexes
assetRepairSchema.index({ asset: 1, status: 1 });
assetRepairSchema.index({ repairDate: -1 });

export default mongoose.model('AssetRepair', assetRepairSchema);
