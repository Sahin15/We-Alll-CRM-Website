import mongoose from "mongoose";

const businessDocumentSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    category: {
      type: String,
      enum: [
        "contract",
        "proposal",
        "requirement",
        "client_brief",
        "design",
        "technical",
        "approval",
        "meeting",
        "report",
        "invoice",
        "other",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
    },
    filename: {
      type: String,
    },
    path: {
      type: String, // S3 URL or path
    },
    size: {
      type: Number,
    },
    mimetype: {
      type: String,
    },
    description: {
      type: String,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    replaces: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessDocument",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    relatedMilestoneId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedDeliverableId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedCommitmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectCommitment",
    },
    relatedExpectationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectExpectation",
    },
    relatedProjectMonthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectMonth",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexing for quick lookups
businessDocumentSchema.index({ client: 1, isActive: 1 });
businessDocumentSchema.index({ project: 1, isActive: 1 });

const BusinessDocument = mongoose.model("BusinessDocument", businessDocumentSchema);
export default BusinessDocument;
