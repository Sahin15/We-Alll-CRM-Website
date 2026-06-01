import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    offerNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "generated", "sent", "accepted", "declined", "expired", "converted"],
      default: "draft",
    },
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, required: true, trim: true, lowercase: true },
    candidatePhone: { type: String, trim: true },
    proposedDesignation: { type: String, trim: true },
    proposedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    proposedJoiningDate: { type: Date },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "intern", "freelancer", "contract"],
      default: "full-time",
    },
    ctc: { type: Number },
    ctcDisplay: { type: String, trim: true },
    probationPeriod: { type: String, default: "6 months" },
    noticePeriod: { type: String, default: "30 days" },
    workLocation: { type: String, default: "Kolkata Office" },
    offerValidTill: { type: Date },
    variableSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    documentUrl: { type: String },
    documentSize: { type: Number },
    linkedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
    convertedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    convertedAt: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: { type: String, trim: true },
    hiringRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HiringRequest",
    },
    hiringApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HiringApplication",
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Applicant",
    },
  },
  { timestamps: true }
);

offerSchema.index({ status: 1, createdAt: -1 });
offerSchema.index({ candidateEmail: 1 });
offerSchema.index({ convertedUserId: 1 });

export default mongoose.model("Offer", offerSchema);
