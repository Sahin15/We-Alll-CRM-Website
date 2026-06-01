import mongoose from "mongoose";

const hiringRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    designation: { type: String, required: true, trim: true },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "intern", "freelancer", "contract"],
      default: "full-time",
    },
    headcount: { type: Number, required: true, min: 1, default: 1 },
    skills: { type: String, trim: true },
    experienceRange: { type: String, trim: true },
    jobDescription: { type: String, trim: true },
    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    justification: { type: String, required: true, trim: true },
    preferredJoiningDate: { type: Date },
    budgetNotes: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "hr_approved",
        "hr_rejected",
        "on_hold",
        "in_progress",
        "filled",
        "cancelled",
      ],
      default: "draft",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    hrNotes: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    assignedHr: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    filledCount: { type: Number, default: 0, min: 0 },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

hiringRequestSchema.index({ status: 1, createdAt: -1 });
hiringRequestSchema.index({ department: 1, status: 1 });

export default mongoose.model("HiringRequest", hiringRequestSchema);
