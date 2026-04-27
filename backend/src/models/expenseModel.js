import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee is required"],
      index: true,
    },
    category: {
      type: String,
      enum: ["travel", "food", "accommodation", "office_supplies", "client_meeting", "training", "other"],
      default: null,
      // Deprecated: Use expensePurpose and expenseType instead
    },
    expensePurpose: {
      type: String,
      enum: [
        "internal_office",
        "existing_client",
        "prospective_client",
        "seminar",
        "expo",
        "vendor_meeting",
        "recruitment",
        "training",
        "marketing_activity",
        "team_activity",
        "travel_visit"
      ],
      required: [true, "Expense purpose is required"],
    },
    expenseType: {
      type: String,
      enum: [
        "food",
        "travel",
        "hotel",
        "transport",
        "materials",
        "entry_fee",
        "gift",
        "printing",
        "miscellaneous"
      ],
      required: [true, "Expense type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be positive"],
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["INR"],
    },
    date: {
      type: Date,
      required: [true, "Expense date is required"],
      validate: {
        validator: function (value) {
          return value <= new Date();
        },
        message: "Expense date cannot be in the future",
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    merchant: {
      type: String,
      trim: true,
      maxlength: [200, "Merchant name cannot exceed 200 characters"],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "credit_card", "debit_card", "bank_transfer", "upi", "other"],
      required: [true, "Payment method is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "reimbursed"],
      default: "pending",
      index: true,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    receiptFileName: {
      type: String,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    approvalComments: {
      type: String,
      trim: true,
      maxlength: [500, "Approval comments cannot exceed 500 characters"],
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
    },
    reimbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reimbursementDate: {
      type: Date,
      default: null,
    },
    reimbursementMethod: {
      type: String,
      enum: ["bank_transfer", "cash", "check", "other"],
      default: null,
    },
    reimbursementReference: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
expenseSchema.index({ employee: 1, status: 1 });
expenseSchema.index({ employee: 1, date: -1 });
expenseSchema.index({ status: 1, createdAt: -1 });
expenseSchema.index({ project: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ expensePurpose: 1 });
expenseSchema.index({ expenseType: 1 });
expenseSchema.index({ expensePurpose: 1, expenseType: 1 });

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
