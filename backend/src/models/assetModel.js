import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    // Identity
    assetId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'laptop',
        'desktop',
        'monitor',
        'keyboard',
        'mouse',
        'headset',
        'phone',
        'tablet',
        'printer',
        'scanner',
        'projector',
        'camera',
        'diary',
        'pen',
        'charger',
        'cable',
        'other',
      ],
      required: true,
    },
    brand: String,
    model: String,
    serialNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    description: String,

    // Status
    status: {
      type: String,
      enum: ['available', 'assigned', 'under_repair', 'lost', 'retired'],
      default: 'available',
      index: true,
    },
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'poor'],
      default: 'good',
    },

    // Purchase Info
    purchaseDate: Date,
    purchaseCost: Number,
    vendorName: String,
    invoiceNumber: String,
    invoiceUrl: String,

    // Warranty Info
    warrantyStartDate: Date,
    warrantyEndDate: {
      type: Date,
      index: true,
    },
    warrantyProvider: String,
    warrantyDocumentUrl: String,

    // Current Assignment (denormalized for fast lookup)
    currentAssignment: {
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
      assignedDate: Date,
      condition: String,
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes - removed duplicates since they're already defined in schema with index: true
assetSchema.index({ category: 1 });

// Auto-generate assetId before saving (only if not provided)
assetSchema.pre('save', function (next) {
  if (!this.isNew || this.assetId) return next();
  
  // Generate a temporary ID - will be replaced by controller
  this.assetId = `AST${Date.now().toString().slice(-8)}`;
  next();
});

// Soft delete middleware - exclude deleted assets from queries
assetSchema.query.active = function () {
  return this.where({ isDeleted: false });
};

export default mongoose.model('Asset', assetSchema);
