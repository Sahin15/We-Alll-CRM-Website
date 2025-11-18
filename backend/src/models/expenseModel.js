import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        "salary",
        "rent",
        "utilities",
        "marketing",
        "software",
        "hardware",
        "travel",
        "office_supplies",
        "training",
        "legal",
        "taxes",
        "insurance",
        "maintenance",
        "miscellaneous",
      ],
      required: true,
    },
    subCategory: {
      type: String, // For more specific categorization
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    description: {
      type: String,
      required: true,
    },
    vendor: {
      type: String, // Vendor/Supplier name
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "card", "cash", "cheque", "upi", "other"],
    },
    receiptUrl: {
      type: String, // Receipt/Invoice upload
    },
    receiptNumber: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly", "yearly"],
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ createdBy: 1 });

const Expense = mongoose.model("Expense", expenseSchema);
export default Expense;
