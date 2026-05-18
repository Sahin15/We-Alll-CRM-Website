import mongoose from 'mongoose';

const procurementInvoiceSchema = new mongoose.Schema(
  {
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    vendorInvoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    invoiceAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: function () {
        return this.invoiceAmount;
      },
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
      index: true,
    },
    invoiceDocumentUrl: { type: String },
    invoiceDocumentFileName: { type: String },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

procurementInvoiceSchema.index({ purchaseOrder: 1, paymentStatus: 1 });
procurementInvoiceSchema.index({ dueDate: 1, paymentStatus: 1 });
procurementInvoiceSchema.index({ vendor: 1, createdAt: -1 });

const ProcurementInvoice = mongoose.model(
  'ProcurementInvoice',
  procurementInvoiceSchema,
  'procurementinvoices'
);

export default ProcurementInvoice;
