import mongoose from "mongoose";

/**
 * Payroll export audit trail (Milestone 8 foundation).
 * Controllers stream CSV to the client; this collection records who exported what.
 *
 * Extension: add download URLs, checksums, bank format versions, reconciliation links.
 */
const payrollExportHistorySchema = new mongoose.Schema(
  {
    exportType: {
      type: String,
      required: true,
      enum: [
        "bank_neft",
        "register_pf",
        "register_esi",
        "register_pt",
        "register_tds",
      ],
    },
    payrollPeriod: {
      month: { type: Number, required: true, min: 1, max: 12 },
      year: { type: Number, required: true },
    },
    payrollStatusFilter: {
      type: String,
      default: "approved",
    },
    employeeCount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    exportStatus: {
      type: String,
      enum: ["completed", "failed", "partial"],
      default: "completed",
    },
    fileLocation: {
      type: String,
    },
    formatId: {
      type: String,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

payrollExportHistorySchema.index({
  "payrollPeriod.year": 1,
  "payrollPeriod.month": 1,
  exportType: 1,
});

const PayrollExportHistory = mongoose.model(
  "PayrollExportHistory",
  payrollExportHistorySchema
);

export default PayrollExportHistory;
