import mongoose from "mongoose";

const projectActivityLogSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    projectMonthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectMonth",
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true, // e.g. "expectation.updated", "report.submitted"
    },
    entityType: {
      type: String,
      required: true, // e.g. "ProjectExpectation", "ProjectMonth"
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
    },
    message: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Indexing for client/project histories (No TTL)
projectActivityLogSchema.index({ project: 1, createdAt: -1 });
projectActivityLogSchema.index({ client: 1, createdAt: -1 });

const ProjectActivityLog = mongoose.model("ProjectActivityLog", projectActivityLogSchema);
export default ProjectActivityLog;
