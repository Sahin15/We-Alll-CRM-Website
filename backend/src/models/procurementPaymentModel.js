import mongoose from 'mongoose';

const procurementPaymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProcurementInvoice',
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'upi', 'cash'],
      required: true,
    },
    transactionReference: {
      type: String,
      required: true,
      trim: true,
    },
    notes: { type: String, maxlength: 500 },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

procurementPaymentSchema.index({ invoice: 1, createdAt: -1 });
procurementPaymentSchema.index({ vendor: 1, paymentDate: -1 });

const ProcurementPayment = mongoose.model('ProcurementPayment', procurementPaymentSchema);

export default ProcurementPayment;
