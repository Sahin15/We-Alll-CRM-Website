import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    amount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    paymentDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "paid",
        "pending",
        "overdue",
        "partial",
        "cancelled",
        "verified",
        "rejected",
      ],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: [
        "bank_transfer",
        "card",
        "upi",
        "cash",
        "cheque",
        "paypal",
        "other",
      ],
    },
    transactionId: {
      type: String,
    },
    upiDetails: {
      upiId: String,
      transactionId: String,
      paymentProof: String,
    },
    paymentProof: {
      type: String,
    },
    notes: {
      type: String,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate balance
paymentSchema.pre("save", function (next) {
  if (this.isModified("paidAmount") || this.isModified("amount")) {
    this.balanceAmount = this.amount - this.paidAmount;

    // Update status based on payment
    if (this.paidAmount === 0) {
      this.status = "pending";
    } else if (this.paidAmount >= this.amount) {
      this.status = "paid";
      this.balanceAmount = 0;
    } else {
      this.status = "partial";
    }
  }

  // Check if overdue
  if (this.status !== "paid" && this.dueDate && new Date() > this.dueDate) {
    this.status = "overdue";
  }

  next();
});

// Index for faster queries
paymentSchema.index({ client: 1, status: 1 });
paymentSchema.index({ dueDate: 1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
