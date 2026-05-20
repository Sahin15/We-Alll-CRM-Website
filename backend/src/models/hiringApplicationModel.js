import mongoose from "mongoose";

const stageHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ["sourced", "shortlisted", "selected", "rejected", "withdrawn"],
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const hiringApplicationSchema = new mongoose.Schema(
  {
    hiringRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HiringRequest",
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Applicant",
      required: true,
    },
    stage: {
      type: String,
      enum: ["sourced", "shortlisted", "selected", "rejected", "withdrawn"],
      default: "sourced",
    },
    stageHistory: [stageHistorySchema],
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

hiringApplicationSchema.index({ hiringRequest: 1, applicant: 1 }, { unique: true });
hiringApplicationSchema.index({ hiringRequest: 1, stage: 1 });

export default mongoose.model("HiringApplication", hiringApplicationSchema);
