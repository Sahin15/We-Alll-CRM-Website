import mongoose from "mongoose";
import {
  PERIOD_STATUSES,
  assertPeriodAction,
} from "../services/payroll/payrollPeriodTransitions.js";

const payrollPeriodSchema = new mongoose.Schema(
  {
    month: {
      type: Number,
      required: [true, "Month is required"],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: 2020,
      max: 2100,
    },
    cutoffDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: PERIOD_STATUSES,
      default: "open",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    unlockReason: {
      type: String,
      trim: true,
      default: "",
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    frozenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    frozenAt: Date,
    lockedAt: Date,
    unlockedAt: Date,
    paidAt: Date,
  },
  {
    timestamps: true,
  }
);

payrollPeriodSchema.index({ year: 1, month: 1 }, { unique: true });
payrollPeriodSchema.index({ status: 1, year: -1, month: -1 });

/**
 * Apply a named period action and stamp actor metadata.
 * @param {"freeze"|"unfreeze"|"lock"|"unlock"|"markPaid"} action
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @param {{ unlockReason?: string }} [options]
 */
payrollPeriodSchema.methods.applyAction = function applyAction(
  action,
  userId,
  options = {}
) {
  const { toStatus } = assertPeriodAction(action, this.status, options);
  this.status = toStatus;
  const now = new Date();

  if (action === "freeze") {
    this.frozenBy = userId;
    this.frozenAt = now;
  } else if (action === "unfreeze") {
    this.frozenBy = undefined;
    this.frozenAt = undefined;
  } else if (action === "lock") {
    this.lockedBy = userId;
    this.lockedAt = now;
  } else if (action === "unlock") {
    this.unlockedBy = userId;
    this.unlockedAt = now;
    this.unlockReason = String(options.unlockReason || "").trim();
    this.lockedBy = undefined;
    this.lockedAt = undefined;
  } else if (action === "markPaid") {
    this.paidBy = userId;
    this.paidAt = now;
  }

  return this;
};

payrollPeriodSchema.statics.findByYearMonth = function findByYearMonth(
  year,
  month
) {
  return this.findOne({ year: Number(year), month: Number(month) });
};

const PayrollPeriod = mongoose.model("PayrollPeriod", payrollPeriodSchema);

export default PayrollPeriod;
