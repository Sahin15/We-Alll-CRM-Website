import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
    },
    allowances: [
      {
        type: {
          type: String,
          enum: ["HRA", "travel", "medical", "dearness", "special", "other"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        description: String,
      },
    ],
    deductions: [
      {
        type: {
          type: String,
          enum: [
            "PF",
            "ESI",
            "tax",
            "advance",
            "loan",
            "late_deduction",
            "other",
          ],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        description: String,
      },
    ],
    grossSalary: {
      type: Number,
      default: 0,
    },
    totalAllowances: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      required: true,
    },
    paymentDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "hold", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "cash", "cheque", "upi"],
    },
    transactionId: {
      type: String,
    },
    workingDays: {
      type: Number,
      default: 0,
    },
    presentDays: {
      type: Number,
      default: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    leaveDays: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    overtimeAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
    payslipUrl: {
      type: String, // Generated payslip PDF URL
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Pre-save hook to calculate totals
salarySchema.pre("save", function (next) {
  // Calculate total allowances
  this.totalAllowances = this.allowances.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  // Calculate total deductions
  this.totalDeductions = this.deductions.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  // Calculate gross salary
  this.grossSalary =
    this.basicSalary + this.totalAllowances + (this.overtimeAmount || 0);

  // Calculate net salary
  this.netSalary = this.grossSalary - this.totalDeductions;

  next();
});

// Compound index to ensure unique salary per employee per month/year
salarySchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ status: 1 });
salarySchema.index({ paymentDate: 1 });

const Salary = mongoose.model("Salary", salarySchema);
export default Salary;
