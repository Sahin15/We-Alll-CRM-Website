import mongoose from "mongoose";

const PAYROLL_JOB_TYPES = ["bulk_generate", "bulk_email"];
const PAYROLL_JOB_STATUSES = ["queued", "running", "completed", "failed"];

const payrollJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: PAYROLL_JOB_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: PAYROLL_JOB_STATUSES,
      default: "queued",
      index: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    paymentDate: { type: Date, default: null },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    summary: {
      total: { type: Number, default: 0 },
      success: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
    results: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

payrollJobSchema.index({ createdAt: -1 });
payrollJobSchema.index({ type: 1, status: 1, year: -1, month: -1 });

export { PAYROLL_JOB_TYPES, PAYROLL_JOB_STATUSES };

const PayrollJob = mongoose.model("PayrollJob", payrollJobSchema);
export default PayrollJob;
