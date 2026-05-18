import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
      // Format: PO-YYYY-NNNN
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    linkedPRs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseRequest',
      },
    ],
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

    // Line items (consolidated from linked PRs, may be edited)
    lineItems: [
      {
        itemName: { type: String, required: true },
        description: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
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
        },
        receivedQuantity: { type: Number, default: 0, min: 0 },
        linkedPRItem: { type: mongoose.Schema.Types.ObjectId }, // ref to PR item _id
      },
    ],

    totalValue: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
    },
    expectedDeliveryDate: {
      type: Date,
      required: true,
    },
    paymentTerms: {
      type: String,
      enum: ['Immediate', 'Net 15', 'Net 30', 'Net 45', 'Net 60'],
      required: true,
    },

    status: {
      type: String,
      enum: ['draft', 'issued', 'partially_received', 'fully_received', 'closed', 'cancelled'],
      default: 'draft',
      index: true,
    },

    issuedAt: { type: Date },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String, maxlength: 500 },

    // Budget commitment tracking
    budgetCommitted: {
      type: Boolean,
      default: false,
    },
    committedAmount: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    financialYear: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ vendor: 1, status: 1 });
purchaseOrderSchema.index({ department: 1, financialYear: 1 });
purchaseOrderSchema.index({ status: 1, createdAt: -1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;
