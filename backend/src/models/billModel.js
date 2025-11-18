import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    items: [
      {
        description: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        rate: {
          type: Number,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0, // In percentage
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled", "partial"],
      default: "draft",
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
    termsAndConditions: {
      type: String,
    },
    paymentInstructions: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
    paidAt: {
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

// Auto-generate bill number
billSchema.pre("save", async function (next) {
  if (!this.billNumber) {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `WE${year}${month}`;

    // Count bills with the same prefix
    const count = await mongoose.model("Bill").countDocuments({
      billNumber: new RegExp(`^${prefix}-`),
    });

    this.billNumber = `${prefix}-${String(count + 1).padStart(3, "0")}`;
  }

  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate discount
  if (this.discountType === "percentage") {
    this.discountAmount = (this.subtotal * this.discountValue) / 100;
  } else {
    this.discountAmount = this.discountValue;
  }

  const amountAfterDiscount = this.subtotal - this.discountAmount;

  // Calculate tax
  this.taxAmount = (amountAfterDiscount * this.taxRate) / 100;

  // Calculate total
  this.totalAmount = amountAfterDiscount + this.taxAmount;

  // Calculate balance
  this.balanceAmount = this.totalAmount - this.paidAmount;

  // Update status based on payment
  if (this.paidAmount >= this.totalAmount) {
    this.status = "paid";
    this.balanceAmount = 0;
    if (!this.paidAt) {
      this.paidAt = new Date();
    }
  } else if (this.paidAmount > 0) {
    this.status = "partial";
  }

  // Check if overdue
  if (
    this.status !== "paid" &&
    this.status !== "cancelled" &&
    this.dueDate &&
    new Date() > this.dueDate
  ) {
    this.status = "overdue";
  }

  next();
});

// Indexes for faster queries
billSchema.index({ client: 1, status: 1 });
billSchema.index({ dueDate: 1 });

const Bill = mongoose.model("Bill", billSchema);
export default Bill;
