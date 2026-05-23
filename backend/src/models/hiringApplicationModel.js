import mongoose from "mongoose";

const stageHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: [
        "sourced",
        "shortlisted",
        "interview_scheduled",
        "interviewed",
        "selected",
        "rejected",
        "withdrawn",
      ],
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

const interviewSchema = new mongoose.Schema(
  {
    round: { type: Number, default: 1, min: 1 },
    title: { type: String, trim: true, default: "Interview" },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 45, min: 15, max: 480 },
    mode: {
      type: String,
      enum: ["in_person", "video", "phone"],
      default: "video",
    },
    locationOrLink: { type: String, trim: true },
    interviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no_show"],
      default: "scheduled",
    },
    remarks: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    recommendation: {
      type: String,
      enum: ["proceed", "reject", "hold"],
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
  },
  { timestamps: true }
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
      enum: [
        "sourced",
        "shortlisted",
        "interview_scheduled",
        "interviewed",
        "selected",
        "rejected",
        "withdrawn",
      ],
      default: "sourced",
    },
    stageHistory: [stageHistorySchema],
    decisionReason: { type: String, trim: true },
    interviews: [interviewSchema],
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
hiringApplicationSchema.index({ "interviews.scheduledAt": 1 });

export default mongoose.model("HiringApplication", hiringApplicationSchema);
