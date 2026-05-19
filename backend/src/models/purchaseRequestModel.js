import mongoose from 'mongoose';

const purchaseRequestSchema = new mongoose.Schema(
  {
    prNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
      // Format: PR-YYYY-NNNN
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    requiredByDate: {
      type: Date,
      default: null,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },

    // Line items (at least one required)
    items: [
      {
        itemName: { type: String, required: true },
        description: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        estimatedUnitPrice: { type: Number, required: true, min: 0 },
        category: {
          type: String,
          enum: [
            'IT Hardware',
            'IT Software',
            'Office Supplies',
            'Furniture',
            'Services',
            'Marketing',
            'Travel',
            'Maintenance',
            'Other',
          ],
          required: true,
        },
      },
    ],

    // Computed / denormalised
    estimatedTotalCost: {
      type: Number,
      required: true,
      min: 0,
    },

    justification: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ['draft', 'pending_hod', 'pending_admin', 'approved', 'rejected', 'po_created'],
      default: 'draft',
      index: true,
    },

    // Approval chain
    hodApproval: {
      approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: { type: String, enum: ['approved', 'rejected'] },
      comments: { type: String, maxlength: 500 },
      timestamp: { type: Date },
    },
    adminApproval: {
      approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: { type: String, enum: ['approved', 'rejected'] },
      comments: { type: String, maxlength: 500 },
      timestamp: { type: Date },
    },

    // Audit log (immutable — only push, never update)
    auditLog: [
      {
        previousStatus: { type: String },
        newStatus: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        timestamp: { type: Date, default: Date.now },
        comments: { type: String },
      },
    ],

    // Budget check result at submission time
    budgetCheckResult: {
      availableBudget: { type: Number },
      estimatedCost: { type: Number },
      exceeded: { type: Boolean },
      overrideAcknowledged: { type: Boolean, default: false },
    },

    // Supporting documents (up to 5)
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileSize: { type: Number }, // bytes
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    financialYear: {
      type: String,
      required: true,
      // Format: "2025-2026"
    },
  },
  { timestamps: true }
);

purchaseRequestSchema.index({ requestedBy: 1, status: 1 });
purchaseRequestSchema.index({ department: 1, status: 1 });
purchaseRequestSchema.index({ financialYear: 1, status: 1 });
purchaseRequestSchema.index({ createdAt: -1 });

const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);

export default PurchaseRequest;
