import mongoose from "mongoose";
import { ADJUSTMENT_TYPES } from "../services/payroll/simplePayrollCalculator.js";

const auditEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    at: { type: Date, default: Date.now },
    reason: { type: String, default: "", trim: true },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const payrollAdjustmentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      min: 2000,
    },
    type: {
      type: String,
      enum: ADJUSTMENT_TYPES,
      required: true,
    },
    /** Non-negative magnitude; sign from type or direction */
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    direction: {
      type: String,
      enum: ["credit", "debit"],
      default: null,
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    /** Days deducted from earned leave (leave_balance_deduction only) */
    leaveDays: {
      type: Number,
      min: 0,
      default: null,
    },
    payrollMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "approved", "rejected", "void"],
      default: "draft",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    auditTrail: {
      type: [auditEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

payrollAdjustmentSchema.index({ employee: 1, year: 1, month: 1, status: 1 });

const PayrollAdjustment = mongoose.model(
  "PayrollAdjustment",
  payrollAdjustmentSchema
);

export default PayrollAdjustment;
