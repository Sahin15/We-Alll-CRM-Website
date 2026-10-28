import mongoose from "mongoose";

const metaSyncRunSchema = new mongoose.Schema(
  {
    companyScope: { type: String, required: true, index: true },
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: "MetaIntegration" },
    trigger: { type: String, enum: ["manual", "reconciliation", "webhook"], required: true },
    status: { type: String, enum: ["running", "success", "partial", "failed"], default: "running" },
    incremental: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    stats: {
      fetched: { type: Number, default: 0 },
      created: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

metaSyncRunSchema.index({ companyScope: 1, startedAt: -1 });

const MetaSyncRun = mongoose.model("MetaSyncRun", metaSyncRunSchema);
export default MetaSyncRun;
