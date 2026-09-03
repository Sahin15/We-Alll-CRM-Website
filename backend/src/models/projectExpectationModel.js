import mongoose from "mongoose";

const projectExpectationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    source: {
      type: String,
      enum: ["kickoff", "email", "meeting", "whatsapp", "brief", "other"],
      default: "other",
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "met", "partially_met", "dropped"],
      default: "open",
    },
    relatedDeliverableIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      }
    ],
    relatedCommitmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProjectCommitment",
      }
    ],
    notes: {
      type: String,
      trim: true,
    },
    evidenceDocumentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BusinessDocument",
      }
    ],
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

projectExpectationSchema.index({ project: 1, status: 1 });

const ProjectExpectation = mongoose.model("ProjectExpectation", projectExpectationSchema);
export default ProjectExpectation;
