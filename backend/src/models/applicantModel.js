import mongoose from "mongoose";

const applicantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, trim: true },
    resumeUrl: { type: String },
    resumeFilename: { type: String },
    resumeSize: { type: Number },
    skills: { type: String, trim: true },
    experienceYears: { type: Number },
    currentCompany: { type: String, trim: true },
    expectedCtc: { type: String, trim: true },
    source: {
      type: String,
      enum: ["referral", "linkedin", "naukri", "walk_in", "other"],
      default: "other",
    },
    tags: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["active", "archived", "hired", "blacklisted"],
      default: "active",
    },
    notes: { type: String, trim: true },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

applicantSchema.index({ email: 1 });
applicantSchema.index({ status: 1, createdAt: -1 });
applicantSchema.index({ name: "text", email: "text", skills: "text" });

export default mongoose.model("Applicant", applicantSchema);
