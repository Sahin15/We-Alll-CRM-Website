import mongoose from "mongoose";

const projectCommitmentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
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
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["proposed", "accepted", "in_progress", "delivered", "missed", "cancelled"],
      default: "proposed",
    },
    relatedDeliverableIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      }
    ],
    relatedWorkItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkItem",
      }
    ],
    relatedExpectationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProjectExpectation",
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
    committedAt: {
      type: Date,
      default: Date.now,
    },
    committedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

projectCommitmentSchema.index({ project: 1, status: 1 });

const ProjectCommitment = mongoose.model("ProjectCommitment", projectCommitmentSchema);
export default ProjectCommitment;
