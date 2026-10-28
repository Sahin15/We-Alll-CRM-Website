import mongoose from "mongoose";

const metaWebhookEventSchema = new mongoose.Schema(
  {
    companyScope: { type: String, required: true },
    leadgenId: { type: String, required: true },
    pageId: { type: String, default: "" },
    formId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "processed", "skipped", "failed"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

metaWebhookEventSchema.index({ companyScope: 1, leadgenId: 1 }, { unique: true });

const MetaWebhookEvent = mongoose.model("MetaWebhookEvent", metaWebhookEventSchema);
export default MetaWebhookEvent;
