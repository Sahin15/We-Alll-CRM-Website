import mongoose from 'mongoose';

const goodsReceiptSchema = new mongoose.Schema(
  {
    grNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
      // Format: GR-YYYY-NNNN
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receivedDate: {
      type: Date,
      required: true,
    },

    lineItems: [
      {
        poLineItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        itemName: { type: String, required: true },
        orderedQuantity: { type: Number, required: true },
        receivedQuantity: { type: Number, required: true, min: 0 },
        // receivedQuantity must be <= orderedQuantity - previously received
        unitPrice: { type: Number },
        category: { type: String },
        notes: { type: String },
      },
    ],

    deliveryNoteUrl: { type: String },
    deliveryNoteFileName: { type: String },

    // Asset creation tracking
    assetCreationPrompted: { type: Boolean, default: false },
    createdAssets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
      },
    ],

    notes: { type: String, maxlength: 1000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

goodsReceiptSchema.index({ purchaseOrder: 1, createdAt: -1 });

const GoodsReceipt = mongoose.model('GoodsReceipt', goodsReceiptSchema);

export default GoodsReceipt;
